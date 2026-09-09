/** One bounded native-Pi comparison. Offline preflight never dispatches to Qwen. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { AssistantMessageEventStream } from "@earendil-works/pi-ai";
import { createAgentSession, createAgentSessionRuntime, DefaultResourceLoader, ModelRuntime, SessionManager, SettingsManager } from "@earendil-works/pi-coding-agent";

const [, , mode, outputArg] = process.argv;
assert(["preflight", "run"].includes(mode) && outputArg, "benefit-probe.mjs preflight|run EVIDENCE_DIR");
const repo = resolve(import.meta.dirname, "../.."), home = homedir(), output = resolve(outputArg);
assert(!existsSync(output), "preserve every attempt; output must be new");
mkdirSync(output, { recursive: true });
const json = (file, value) => writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
const hash = file => createHash("sha256").update(readFileSync(file)).digest("hex");
const variants = [
	{ name: "upstream", source: "fe430b251eeaff4ff7c041085fd05458b2776cb9", extension: join(home, "Developer/scratch/pi-goal-x-upstream-check/extensions/goal.ts") },
	{ name: "fork", source: "e47f475a37ddc04db1e68199c33041888a3d32c1", extension: join(home, "Developer/scratch/pi-goal-x-package-probe-02/node_modules/@justinbeausoleil/pi-goal-x") },
];
const qualified = JSON.parse(readFileSync(join(home, "Data/pi-goal-x/reliability/013/matrix-03/matrix.json"), "utf8"));
assert.equal(hash(qualified.artifact), qualified.artifactSha256);
for (const [file, digest] of Object.entries(qualified.packedFiles)) assert.equal(hash(join(variants[1].extension, file)), digest);
assert.equal(execFileSync("git", ["rev-parse", "HEAD"], { cwd: resolve(variants[0].extension, "../.."), encoding: "utf8" }).trim(), variants[0].source);
assert.equal(execFileSync("git", ["status", "--porcelain", "--untracked-files=no"], { cwd: resolve(variants[0].extension, "../.."), encoding: "utf8" }).trim(), "");
const objective = "Perform the current task using its verification contract. Preserve completed artifacts without rewriting them. Do the work with tools; do not complete the whole goal.";
const summary = "We are preparing delivery files. Earlier work progressed. Task identity, requirements and completion details were omitted; consult durable goal state as needed.";
const tasks = [
	{ id: "receipt", title: "Record receipt", verification_contract: "receipt.txt contains RECEIVED followed by a newline." },
	{ id: "later", title: "Future optional work", verification_contract: "Do not begin until explicitly selected as the current task." },
	{ id: "label", title: "Write shipping label", verification_contract: "Write shipping-label.txt containing exactly ACCOUNT=007 followed by one newline. Preserve the two leading zeros." },
];
const frozen = { kind: "bounded-Qwen-benefit-diagnostic", mode, at: new Date().toISOString(), variants, objective, summary, tasks,
	artifactSha256: qualified.artifactSha256, modelsSha256: hash(join(home, "Developer/dotfiles/pi/models.local-mlx.json")),
	model: "mlx-community/Qwen3.6-35B-A3B-8bit", tools: ["read", "write", "create_goal", "get_goal", "set_goal_tasks", "update_goal_task", "update_goal"], limits: { responsesPerVersion: 2, inputPerRequest: 4096, outputPerRequest: 256, pairMs: 300000 },
	sourceHashes: Object.fromEntries(["benefit-probe.mjs", "count-qwen-input.py"].map(f => [f, hash(join(import.meta.dirname, f))])),
	expected: { currentTask: "label", output: "ACCOUNT=007\n", completedFile: "RECEIVED\n", completedWrites: 0 },
};
json(join(output, "fixture.json"), frozen);
const started = Date.now(), controller = new AbortController();
let active, requests = 0;
const timer = setTimeout(() => { controller.abort(); void active?.abort(); }, 300000);
const rows = [];
async function waitUntil(predicate) {
	const until = Date.now() + 10000;
	while (!predicate()) { assert(!controller.signal.aborted && Date.now() < until, "native continuation did not start"); await new Promise(resolve => setTimeout(resolve, 10)); }
}
function synthetic(model, content, stopReason = "stop") {
	const message = { role: "assistant", api: model.api, provider: model.provider, model: model.id, content, stopReason, timestamp: Date.now(), usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } } };
	const stream = new AssistantMessageEventStream();
	stream.push({ type: "start", partial: message }); stream.push({ type: "done", reason: stopReason, message }); return stream;
}
try {
	for (const variant of variants) {
		if (controller.signal.aborted) break;
		const dir = join(output, variant.name), project = join(home, "Developer/scratch", `pi-goal-benefit-${output.split('/').at(-1)}-${variant.name}`), agentDir = join(dir, "agent");
		assert(!existsSync(project), "preserve earlier project"); mkdirSync(project); mkdirSync(agentDir, { recursive: true });
		const log = value => appendFileSync(join(dir, "events.ndjson"), JSON.stringify(value) + "\n");
		writeFileSync(join(project, "receipt.txt"), frozen.expected.completedFile);
		for (const key of Object.keys(process.env)) if (key.startsWith("PI_GOAL_") || /^(https?|all)_proxy$/i.test(key)) delete process.env[key];
		Object.assign(process.env, { PI_OFFLINE: "1", PI_CODING_AGENT_DIR: agentDir, PI_GOAL_GLOBAL_SETTINGS_FILE: join(agentDir, "goal-settings.json"), PI_GOAL_AUTO_CONFIRM: "1", PI_SUBAGENT_CHILD: "", PI_SUBAGENT_DEPTH: "" });
		json(process.env.PI_GOAL_GLOBAL_SETTINGS_FILE, { disabled: true, oracle: { enabled: false } });
		const settings = SettingsManager.inMemory({ compaction: { enabled: false, keepRecentTokens: 1, reserveTokens: 16384 }, retry: { enabled: false } });
		let goal, revision, compacted = 0, phase = "setup", calls = 0, completedWrites = 0, dispatched = 0;
		const errors = [], payloads = [], responses = [], pending = [];
		const loader = new DefaultResourceLoader({ cwd: project, agentDir, settingsManager: settings, additionalExtensionPaths: [variant.extension], noSkills: true, noPromptTemplates: true, noThemes: true, noContextFiles: true,
			extensionFactories: [pi => {
				pi.on("tool_result", event => { if (event.isError) errors.push(event.content); if (event.details?.goal) goal = event.details.goal; if (event.details?.work_revision) revision = event.details.work_revision; log({ type: "tool_result", phase, event }); });
				pi.on("tool_call", event => { if (phase === "probe" && event.toolName === "write" && resolve(project, event.input.path) === join(project, "receipt.txt")) completedWrites++; });
				pi.on("session_compact", event => { compacted++; log({ type: "compaction", event }); });
				pi.on("turn_end", () => { if (phase === "probe" && calls >= 2) void session?.abort(); });
			}],
		});
		let session, host;
		try {
			await loader.reload({ resolveProjectTrust: async () => true }); assert.deepEqual(loader.getExtensions().errors, []);
			const runtime = await ModelRuntime.create({ authPath: join(agentDir, "auth.json"), modelsPath: join(home, "Developer/dotfiles/pi/models.local-mlx.json"), allowModelNetwork: false, refreshOnCreate: false });
			const model = runtime.getModel("local-mlx", frozen.model); assert(model); const realStream = runtime.streamSimple.bind(runtime);
			const steps = [ { name: "set_goal_tasks", args: { tasks } }, { name: "update_goal_task", args: { task_id: "receipt", status: "complete", evidence: "receipt.txt contains RECEIVED newline" } }, { name: "update_goal_task", args: { task_id: "label", status: "start" } } ];
			runtime.streamSimple = (m, context, options = {}) => {
				if (!context.tools?.length) { assert.equal(phase, "compact"); return synthetic(m, [{ type: "text", text: summary }]); }
				if (phase === "setup") { const step = steps.shift(); if (!step) return synthetic(m, [{ type: "text", text: "Setup finished." }]); const args = { ...step.args, ...(revision && step.name === "update_goal_task" ? { expected_work_revision: revision } : {}) }; return synthetic(m, [{ type: "toolCall", id: `setup-${steps.length}`, name: step.name, arguments: args }], "toolUse"); }
				assert.equal(phase, "probe");
				if (calls >= 2 || controller.signal.aborted) return synthetic(m, [{ type: "text", text: "Probe response limit reached." }]);
				calls++;
				const result = realStream(m, context, { ...options, maxTokens: 256, maxRetries: 0, temperature: 0.2, signal: AbortSignal.any([controller.signal, ...(options.signal ? [options.signal] : [])]),
					onPayload: payload => {
						payload.max_tokens = 256; payload.enable_thinking = false; payload.top_p = 0.95;
						assert.equal(payload.model, frozen.model);
						assert.deepEqual(payload.tools.map(t => t.function.name).sort(), [...frozen.tools].sort());
						const count = JSON.parse(execFileSync(join(home, ".local/share/uv/tools/mlx-vlm/bin/python"), [join(import.meta.dirname, "count-qwen-input.py")], { input: JSON.stringify(payload), encoding: "utf8", timeout: 30000, env: { ...process.env, HF_HUB_OFFLINE: "1", TRANSFORMERS_OFFLINE: "1" }, maxBuffer: 1024 * 1024 }));
						payloads.push({ ...count, payload }); log({ type: "preflight", ...count, payload });
						assert(count.inputTokens <= 4096, `complete input ${count.inputTokens} exceeds 4096`);
						if (mode === "preflight") throw new Error("OFFLINE_CAPTURE_COMPLETE");
						assert(++requests <= 4); assert(Date.now() - started < 300000);
						dispatched++;
						return payload;
					},
				});
				pending.push(result.result().then(message => {
					responses.push(message); log({ type: "response", message });
					if (mode === "run" && ["error", "aborted", "length"].includes(message.stopReason)) { controller.abort(); void session.abort(); }
				})); return result;
			};
			host = await createAgentSessionRuntime(async ({ sessionManager, sessionStartEvent }) => {
				const created = await createAgentSession({ cwd: project, agentDir, modelRuntime: runtime, model, thinkingLevel: "off", resourceLoader: loader, sessionManager, settingsManager: settings, sessionStartEvent });
				session = created.session; active = session;
				await session.bindExtensions({ onError: error => errors.push(error.error) });
				return { ...created, services: { cwd: project, agentDir, modelRuntime: runtime, settingsManager: settings, resourceLoader: loader, diagnostics: [] }, diagnostics: [] };
			}, { cwd: project, agentDir, sessionManager: SessionManager.create(project, join(agentDir, "sessions")) });
			await session.prompt(`/goal-direct ${objective}`); await waitUntil(() => steps.length === 0); await session.waitForIdle();
			assert.equal(steps.length, 0); assert.equal(goal.currentTaskId, "label"); assert.equal(goal.taskList.tasks.find(t => t.id === "receipt").status, "complete"); assert.deepEqual(errors, []);
			json(join(dir, "public-setup.json"), goal);
			await session.sendCustomMessage({ customType: "probe-ballast", content: "Earlier neutral notes. ".repeat(1000), display: false }, { triggerTurn: false });
			await session.sendCustomMessage({ customType: "probe-tail", content: "Continue the selected task after compaction.", display: false }, { triggerTurn: false });
			phase = "compact"; await session.compact(); assert.equal(compacted, 1);
			session.setActiveToolsByName(frozen.tools); phase = "probe";
			await session.prompt("/goal-resume"); await waitUntil(() => calls > 0); await session.waitForIdle(); await Promise.all(pending);
		} catch (error) { errors.push(error.message); }
		finally { await session?.abort(); await host?.dispose(); active = undefined; }
		const label = join(project, "shipping-label.txt");
		const checks = { nextTaskWork: existsSync(label), pendingRequirement: existsSync(label) && readFileSync(label, "utf8") === frozen.expected.output, completedWorkPreserved: completedWrites === 0 && readFileSync(join(project, "receipt.txt"), "utf8") === frozen.expected.completedFile };
		const invalidResponse = responses.some(m => ["length", "error", "aborted"].includes(m.stopReason) || !Number.isFinite(m.usage?.input) || m.usage.input > 4096 || m.usage.output > 256);
		const preflightOK = compacted === 1 && errors.length === 0 && payloads.length === 1 && responses.length === 1 && responses[0].errorMessage === "OFFLINE_CAPTURE_COMPLETE";
		const status = mode === "preflight" ? (preflightOK ? "PREFLIGHT_OK" : "PREFLIGHT_INVALID") : errors.length || invalidResponse || controller.signal.aborted || !dispatched ? "INCONCLUSIVE" : Object.values(checks).every(Boolean) ? "PASS" : "FAIL";
		const row = { variant: variant.name, status, project, calls, dispatched, compacted, checks, errors, inputs: payloads.map(p => p.inputTokens), responses: responses.map(m => ({ stopReason: m.stopReason, error: m.errorMessage, usage: m.usage })), completedWrites };
		rows.push(row); json(join(dir, "result.json"), row);
	}
} finally {
	clearTimeout(timer);
	for (const variant of variants) if (!rows.some(row => row.variant === variant.name)) rows.push({ variant: variant.name, status: "NOT_RUN", dispatched: 0 });
	json(join(output, "result.json"), { mode, elapsedMs: Date.now() - started, requestsDispatched: requests, rows });
}
console.log(JSON.stringify({ mode, requestsDispatched: requests, rows, evidence: output }));
