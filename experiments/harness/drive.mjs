#!/usr/bin/env node
/**
 * harness/drive.mjs
 *
 * Drive a pi AgentSession via the SDK so that:
 *   1. Slash commands fire and their queued continuation turn actually runs
 *      (which `pi -p "/slash"` does NOT wait for; -p exits as soon as the
 *      handler returns, leaving sendMessage-queued turns un-drained).
 *   2. We can chain multiple turns deterministically without --continue.
 *   3. The extension under test is the only loaded extension.
 *
 * NDJSON event stream is written to stdout, matching the `pi --mode json`
 * shape closely enough for extract.sh / grade.sh to consume.
 *
 * Usage:
 *   drive.mjs <case-dir> <run-dir>
 *
 * Required env:
 *   PI_GOAL_TEST_EXTENSION    abs path to extension file or installed package
 *   PI_GOAL_TEST_MODELS_FILE  optional explicit custom models.json path
 *   PI_GOAL_TEST_PROVIDER     provider id (e.g. openrouter, fireworks)
 *   PI_GOAL_TEST_MODEL        model id
 *   PI_GOAL_TEST_THINKING     off | low | medium | high
 *   PI_GOAL_TEST_TURN_TIMEOUT seconds (per session.prompt call), default 180
 *
 * INPUT.md format: lines that begin with "TURN: " are user prompts (one per line).
 * Lines beginning with "#" or empty are ignored.
 */

import { readFileSync, mkdirSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { createRequire } from "node:module";
import {
	createAgentSession,
	createAgentSessionRuntime,
	DefaultResourceLoader,
	ModelRuntime,
	SessionManager,
	SettingsManager,
} from "@earendil-works/pi-coding-agent";

const [, , caseDirArg, runDirArg] = process.argv;
if (!caseDirArg || !runDirArg) {
	console.error("usage: drive.mjs <case-dir> <run-dir>");
	process.exit(2);
}

const caseDir = resolve(caseDirArg);
const runDir = resolve(runDirArg);
const sandboxDir = join(runDir, "sandbox");
const sessionDir = join(runDir, "sessions");
mkdirSync(sandboxDir, { recursive: true });
mkdirSync(sessionDir, { recursive: true });

// Per-case env overrides via <case-dir>/env.json. Loaded BEFORE the extension
// is imported so module-load-time env reads pick them up. Use this to tweak
// extension constants at test time.
function readCaseObject(name) {
	try {
		const parsed = JSON.parse(readFileSync(join(caseDir, name), "utf8"));
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("expected a JSON object");
		return parsed;
	} catch (error) {
		if (error.code === "ENOENT") return {};
		throw new Error(`Invalid ${name}: ${error.message}`);
	}
}
const caseEnv = readCaseObject("env.json");
for (const [key, value] of Object.entries(caseEnv)) {
	if (!["string", "number", "boolean"].includes(typeof value)) throw new Error(`Invalid env.json value for ${key}`);
	process.env[key] = String(value);
}
if (Object.keys(caseEnv).length) console.error(`[drive] case env applied: ${Object.keys(caseEnv).join(", ")}`);

const extPath = process.env.PI_GOAL_TEST_EXTENSION;
const provider = process.env.PI_GOAL_TEST_PROVIDER || "openrouter";
const modelId = process.env.PI_GOAL_TEST_MODEL || "moonshotai/kimi-k2.6";
const thinking = process.env.PI_GOAL_TEST_THINKING || "high";
const turnTimeoutMs = Number(process.env.PI_GOAL_TEST_TURN_TIMEOUT || "180") * 1000;
const QUIET_MS = Number(process.env.PI_GOAL_QUIET_MS || "5000");
if (!Number.isFinite(turnTimeoutMs) || turnTimeoutMs <= 0 || turnTimeoutMs > 2 ** 31 - 1 ||
	!Number.isFinite(QUIET_MS) || QUIET_MS < 0) throw new Error("Invalid harness timeout or quiet-window setting");
if (!["off", "minimal", "low", "medium", "high", "xhigh"].includes(thinking)) throw new Error("Invalid PI_GOAL_TEST_THINKING");
if (!extPath) {
	console.error("PI_GOAL_TEST_EXTENSION env is required");
	process.exit(2);
}

// Parse INPUT.md → array of {kind:"turn", text} or {kind:"sleep", ms}.
const inputPath = join(caseDir, "INPUT.md");
const inputText = readFileSync(inputPath, "utf8");
const turns = [];
for (const line of inputText.split(/\r?\n/)) {
	if (line.startsWith("TURN: ")) {
		turns.push({ kind: "turn", text: line.slice("TURN: ".length) });
	} else if (/^SLEEP:\s*(\d+)/.test(line)) {
		turns.push({ kind: "sleep", ms: Number(RegExp.$1) });
	} else if (/^ABORT_AFTER_MS:\s*(\d+)/.test(line)) {
		// Schedule a session.abort() N ms after the next TURN starts. Tests the
		// goal extension's pauseForAbort code path (B4).
		turns.push({ kind: "abort_after_ms", ms: Number(RegExp.$1) });
	}
}
if (!turns.some(turn => turn.kind === "turn" && turn.text.trim())) {
	console.error("INPUT.md has no 'TURN: <prompt>' lines");
	process.exit(2);
}

// Run pi in the sandbox so disk-backed extension artifacts (.pi/goals/) land there.
process.chdir(sandboxDir);
const agentDir = join(runDir, "agent-dir");
mkdirSync(agentDir, { recursive: true });
process.env.PI_CODING_AGENT_DIR = agentDir;
process.env.PI_GOAL_GLOBAL_SETTINGS_FILE = join(agentDir, "goal-settings.json");
const modelRuntime = await ModelRuntime.create({
	authPath: join(agentDir, "auth.json"),
	modelsPath: process.env.PI_GOAL_TEST_MODELS_FILE ?? null,
	allowModelNetwork: false,
	refreshOnCreate: false,
});
if (modelRuntime.getError()) throw new Error(modelRuntime.getError());

let model = modelRuntime.getModel(provider, modelId);
if (!model) {
	// CLI behaviour: when --provider X --model Y but Y is not a known built-in or
	// custom model under provider X, pi constructs a "custom model id" — taking
	// the shape of any same-provider model and overriding id+name. We replicate
	// that here for fireworks router IDs etc. See pi's buildFallbackModel().
	const sameProvider = modelRuntime.getModels(provider);
	if (sameProvider.length === 0) {
		console.error(`No models available for provider "${provider}". Cannot build fallback.`);
		process.exit(2);
	}
	const base = sameProvider[0];
	model = { ...base, id: modelId, name: modelId };
	console.error(`[drive] Model "${provider}/${modelId}" not in registry; using custom model id (base=${base.id}).`);
}

// Custom settings: disable compaction (tests are short, we don't want auto-compact
// kicking in mid-test and confusing the rubric). A case can opt in to compaction
// by dropping a `compaction.json` file in its case dir, e.g.:
//   { "enabled": true, "reserveTokens": 16384, "keepRecentTokens": 4096 }
const compactionConfig = { enabled: false, ...readCaseObject("compaction.json") };
for (const [key, value] of Object.entries(compactionConfig)) {
	if (key === "enabled" ? typeof value !== "boolean" :
		!["reserveTokens", "keepRecentTokens"].includes(key) || !Number.isFinite(value) || value < 0) {
		throw new Error(`Invalid compaction.json setting: ${key}`);
	}
}
const settingsManager = SettingsManager.inMemory({
	compaction: compactionConfig,
	retry: { enabled: true, maxRetries: 2 },
});

const resourceLoader = new DefaultResourceLoader({
	cwd: sandboxDir,
	agentDir,
	settingsManager,
	additionalExtensionPaths: [extPath],
	noExtensions: false, // we want extensions, but default discovery is empty (agentDir is fresh)
	noSkills: true,
	noPromptTemplates: true,
	noThemes: true,
	noContextFiles: true,
});
await resourceLoader.reload({ resolveProjectTrust: async () => true });

// Surface extension load errors loud and clear.
const extInfo = resourceLoader.getExtensions();
for (const e of extInfo.errors) {
	console.error(`[drive] extension load error: ${e.path}: ${e.error}`);
}
if (extInfo.errors.length || extInfo.extensions.length !== 1) {
	console.error("[drive] expected exactly one successfully loaded extension");
	process.exit(2);
}
// Reuse this candidate's existing classifier, loaded with Pi's TS loader.
// An active goal alone cannot tell us whether a provider failure is recoverable.
const { createJiti } = createRequire(import.meta.resolve("@earendil-works/pi-coding-agent"))("jiti");
const { isNetworkErrorAssistantMessage, isAbortedAssistantMessage } = await createJiti(import.meta.url).import(join(import.meta.dirname, "../../extensions/goal-format.ts"));

// Persistent session under the run dir so we can inspect after.
const sessionManager = SessionManager.create(sandboxDir, sessionDir);

let failed = false;
let providerError;
let recoveryEligible = false;
const host = await createAgentSessionRuntime(async ({ sessionManager, sessionStartEvent }) => {
	const created = await createAgentSession({
		cwd: sandboxDir, agentDir, model, thinkingLevel: thinking, modelRuntime,
		resourceLoader, sessionManager, settingsManager, sessionStartEvent,
	});
	await created.session.bindExtensions({ onError: error => {
		failed = true;
		console.error(`[drive] extension error: ${error.error}`);
	} });
	return { ...created, services: { cwd: sandboxDir, agentDir, modelRuntime, settingsManager, resourceLoader, diagnostics: [] }, diagnostics: [] };
}, { cwd: sandboxDir, agentDir, sessionManager });
const { session, modelFallbackMessage } = host;

if (modelFallbackMessage) {
	console.error(`[drive] modelFallback: ${modelFallbackMessage}`);
}

// Emit a synthetic `session` event up front to match `pi --mode json` shape.
const emit = (obj) => {
	process.stdout.write(JSON.stringify(obj) + "\n");
};

emit({
	type: "session",
	version: 3,
	id: session.sessionId,
	timestamp: new Date().toISOString(),
	cwd: sandboxDir,
});

const unsubscribe = session.subscribe((event) => {
	try {
		emit(event);
		if (event.type === "message_end" && event.message.role === "assistant") {
			providerError = event.message.stopReason === "error" ? event.message.errorMessage ?? "provider error" : undefined;
			recoveryEligible = isNetworkErrorAssistantMessage(event.message) || isAbortedAssistantMessage(event.message);
		}
	} catch (err) {
		console.error(`[drive] failed to emit event: ${err?.message || err}`);
	}
});

let aborted = false;

// Slash command handlers in this extension call pi.sendMessage(..., {triggerTurn:true})
// fire-and-forget. session.prompt("/cmd") therefore resolves before the queued
// triggered turn finishes. To capture the full effect of a slash command we wait
// until *all* triggered work is quiescent: isStreaming = false and no new
// turn_start within a quiet window after the last turn_end.
let lastTurnActivityAt = Date.now();
let inFlightTurns = 0;
session.subscribe((e) => {
	if (e.type === "turn_start") {
		inFlightTurns += 1;
		lastTurnActivityAt = Date.now();
	} else if (e.type === "turn_end") {
		inFlightTurns = Math.max(0, inFlightTurns - 1);
		lastTurnActivityAt = Date.now();
	} else if (e.type === "agent_start" || e.type === "agent_end") {
		lastTurnActivityAt = Date.now();
	}
});

// Quiet-window for "no more chained activity". Slash commands (sendMessage with
// triggerTurn) queue follow-up turns that fire-and-forget AFTER prompt() resolves.
// The window covers the extension's short continuation timer. Pi's idle/queue
// state owns in-flight work; a persisted active goal can have yielded to the user.
// After a provider error, extension recovery can outlast the quiet window, so
// retain the existing goal-aware wait for that case, bounded by the deadline.
const POLL_MS = 50;

function readActiveGoal() {
	// The extension persists the goal record under .pi/goals/active_goal_*.md
	// (in CWD). After a provider error this tells us whether extension recovery
	// may still be pending beyond the quiet window.
	try {
		const dir = ".pi/goals";
		const list = readdirSync(dir);
		for (const name of list) {
			if (!name.startsWith("active_goal_") || !name.endsWith(".md")) continue;
			const content = readFileSync(join(dir, name), "utf8");
			const end = content.indexOf("\n}");
			if (end < 0) continue;
			const json = content.slice(0, end + 2);
			try {
				const obj = JSON.parse(json);
				return obj;
			} catch { /* fall through */ }
		}
	} catch { /* dir missing or unreadable */ }
	return null;
}

async function waitForQuiescence(deadline) {
	// Each new turn resets the quiet window; native busy/queued work keeps it open.
	while (Date.now() < deadline) {
		const idle = session.isIdle && session.pendingMessageCount === 0 && inFlightTurns === 0;
		const sinceActivity = Date.now() - lastTurnActivityAt;
		if (idle && sinceActivity >= QUIET_MS) {
			if (!recoveryEligible) return true;
			// An active automatic goal can still have a delayed recovery attempt.
			const g = readActiveGoal();
			if (!g || g.status !== "active" || g.autoContinue === false) return true;
			// Goal is still active+autoContinue. Wait up to deadline for the
			// next turn_start. The deadline acts as the upper bound.
		}
		await new Promise((r) => setTimeout(r, POLL_MS));
	}
	return false;
}

const promptWithTimeout = async (text, idx, opts = {}) => {
	const start = Date.now();
	emit({ type: "_turn_marker", index: idx, prompt: text });
	const deadline = Date.now() + turnTimeoutMs;
	lastTurnActivityAt = Date.now();
	let abortTimer = null;
	let promptTimer;
	if (opts.abortAfterMs && opts.abortAfterMs > 0) {
		emit({ type: "_drive_abort_armed", index: idx, after_ms: opts.abortAfterMs });
		abortTimer = setTimeout(() => {
			emit({ type: "_drive_abort_scheduled", index: idx, after_ms: opts.abortAfterMs });
			session.abort().catch(e => {
				failed = true;
				emit({ type: "_drive_abort_error", index: idx, error: String(e?.message || e) });
			});
		}, opts.abortAfterMs);
	}
	try {
		const promptResult = session.prompt(text);
		// Race prompt completion against timeout; we also want to drain triggered
		// turns even after prompt() resolves.
		await Promise.race([
			promptResult,
			new Promise((_, rej) => { promptTimer = setTimeout(() => rej(new Error("prompt timeout")), turnTimeoutMs); }),
		]);
		clearTimeout(promptTimer);
		// Now wait for the system to actually go quiet (slash commands trigger
		// background turns; we want those captured before moving on).
		if (!await waitForQuiescence(deadline)) throw new Error(providerError ? `provider recovery timeout: ${providerError}` : "queued work timeout");
		if (providerError) throw new Error(providerError);
	} catch (err) {
		failed = true;
		emit({ type: "_drive_error", index: idx, message: String(err?.message || err) });
		if (String(err?.message || "").includes("timeout")) {
			aborted = true;
			session.abort().catch(() => {});
		}
	} finally {
		clearTimeout(promptTimer);
		if (abortTimer) clearTimeout(abortTimer);
	}
	const elapsed = Date.now() - start;
	emit({ type: "_turn_done", index: idx, elapsed_ms: elapsed });
};

try {
	let idx = 0;
	let pendingAbortMs = 0;
	for (const t of turns) {
		if (aborted || failed) break;
		if (t.kind === "turn") {
			idx += 1;
			await promptWithTimeout(t.text, idx, { abortAfterMs: pendingAbortMs });
			pendingAbortMs = 0;
		} else if (t.kind === "sleep") {
			await new Promise((r) => setTimeout(r, t.ms));
		} else if (t.kind === "abort_after_ms") {
			pendingAbortMs = t.ms;
		}
	}
} finally {
	unsubscribe();
	try {
		await host.dispose();
	} catch (error) {
		failed = true;
		console.error(`[drive] shutdown failed: ${error.message}`);
	}
}

process.exit(aborted ? 124 : failed ? 1 : 0);
