/** D6: freeze a six-run matrix, then execute each scheduled run exactly once. */
import assert from "node:assert/strict";
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { execFile, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";
import { promisify } from "node:util";
import { createAgentSession, createAgentSessionRuntime, DefaultResourceLoader, ModelRuntime, SessionManager, SettingsManager, VERSION } from "@earendil-works/pi-coding-agent";
import { isAbortedAssistantMessage, isNetworkErrorAssistantMessage } from "../../extensions/goal-format.ts";
import { parseGoalFile } from "../../extensions/storage/goal-files.ts";
import { makeFixture, milestones, objective, validationProbe } from "./qwen-fixture.ts";

const repo = resolve(import.meta.dirname, "../..");
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const readJson = file => JSON.parse(readFileSync(file, "utf8"));
const writeJson = (file, value) => writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
const sourceFiles = ["experiments/reliability/run-qwen.mjs", "experiments/reliability/qwen-fixture.ts", "extensions/goal-format.ts", "package-lock.json"];
const modelIds = ["mlx-community/Qwen3.6-35B-A3B-8bit", "mlx-community/Qwen3.8-27B-8bit"];
const ballast = "red blue green yellow orange purple black white silver gold. ".repeat(4200);
const [, , command, matrixArg, ...args] = process.argv;
assert(matrixArg && ["freeze", "run"].includes(command), "usage: run-qwen.mjs freeze MATRIX QUALIFICATION INSTALLED_PACKAGE MODELS_JSON | run MATRIX RUN_NUMBER");
const matrixDir = resolve(matrixArg), manifestPath = join(matrixDir, "matrix.json");

if (command === "freeze") {
	assert.equal(VERSION, "0.85.1");
	assert.equal(args.length, 3);
	assert(!existsSync(manifestPath), "keep previous matrices; choose a new directory");
	assert.equal(execFileSync("git", ["status", "--porcelain"], { cwd: repo, encoding: "utf8" }).trim(), "", "commit the fixture/driver before freezing");
	const qualification = readJson(resolve(args[0]));
	assert.equal(qualification.status, "passed");
	const installedPackage = resolve(args[1]), modelsPath = resolve(args[2]);
	const provider = readJson(modelsPath).providers["local-mlx"];
	assert.equal(provider.baseUrl, "http://127.0.0.1:10101/v1");
	assert.equal(provider.api, "openai-completions");
	for (const id of modelIds) {
		const model = provider.models.find(model => model.id === id);
		assert(model, `configured model missing: ${id}`);
		assert.equal(model.contextWindow, 65536);
		assert.equal(model.maxTokens, 8192);
	}
	assert.equal(hash(readFileSync(qualification.artifact)), qualification.sha256);
	const files = execFileSync("tar", ["-tzf", qualification.artifact], { encoding: "utf8" }).trim().split("\n").sort();
	const packedFiles = Object.fromEntries(files.map(name => {
		const relative = name.replace(/^package\//, "");
		const digest = hash(execFileSync("tar", ["-xOf", qualification.artifact, name]));
		assert.equal(hash(readFileSync(join(installedPackage, relative))), digest, `installed package differs: ${relative}`);
		if (relative.startsWith("extensions/")) assert.equal(hash(readFileSync(join(repo, relative))), digest, `candidate source differs: ${relative}`);
		return [relative, digest];
	}));
	mkdirSync(matrixDir, { recursive: true });
	const fixtureFiles = {};
	for (const seed of [101, 102, 103]) {
		const fixture = makeFixture(seed);
		writeFileSync(join(matrixDir, `input-${seed}.csv`), fixture.csv);
		writeJson(join(matrixDir, `expected-${seed}.json`), fixture.expected);
		for (const file of [`input-${seed}.csv`, `expected-${seed}.json`]) fixtureFiles[file] = hash(readFileSync(join(matrixDir, file)));
	}
	writeFileSync(join(matrixDir, "objective.txt"), objective);
	writeJson(join(matrixDir, "probe.json"), validationProbe);
	for (const file of ["objective.txt", "probe.json"]) fixtureFiles[file] = hash(readFileSync(join(matrixDir, file)));
	const runs = modelIds.flatMap(model => [101, 102, 103].map((seed, index) => ({ model, seed, thinking: index === 0 ? "off" : "low" })));
	writeJson(manifestPath, {
		kind: "D6-real-Qwen", frozenAt: new Date().toISOString(), sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: repo, encoding: "utf8" }).trim(),
		sourceHashes: Object.fromEntries(sourceFiles.map(file => [file, hash(readFileSync(join(repo, file)))])),
		artifact: qualification.artifact, artifactSource: qualification.artifactSource, artifactSha256: qualification.sha256, installedPackage, packedFiles,
		modelsPath, modelsSha256: hash(readFileSync(modelsPath)), provider: "local-mlx", modelConfiguration: { api: provider.api, baseUrl: provider.baseUrl, compat: provider.compat },
		pi: "0.85.1", node: process.version, contextWindow: 65536, maxOutput: 8192, temperature: 0.2, topP: 0.95,
		limits: { executorResponses: 60, elapsedMs: 1800000, extensionRecoveries: 2 },
		compaction: { enabled: true, reserveTokens: 16384, keepRecentTokens: 512 },
		boundaries: [{ task: "parse", reason: "manual" }, { task: "normalize", reason: "threshold" }, { task: "aggregate", reason: "manual" }],
		ballast: { chars: ballast.length, sha256: hash(ballast), description: "Repeated color names; no instructions or expected answers." },
		fixtureFiles, milestones, runs: runs.map((run, index) => ({ number: index + 1, ...run })),
	});
	console.log(JSON.stringify({ frozen: manifestPath, runs: runs.length, artifactSha256: qualification.sha256 }));
	process.exit(0);
}

const manifest = readJson(manifestPath), number = Number(args[0]);
assert(["D6-real-Qwen", "native-rehearsal"].includes(manifest.kind));
assert(Number.isInteger(number) && number >= 1 && number <= 6, "run number must be 1 through 6");
const scheduled = manifest.runs[number - 1];
const runDir = join(matrixDir, `run-${String(number).padStart(2, "0")}`);
assert(!existsSync(runDir), "a scheduled run cannot be retried; retain it and use a new full matrix for a changed candidate");
mkdirSync(runDir);
const startedAt = Date.now();
writeJson(join(runDir, "started.json"), { ...scheduled, startedAt: new Date(startedAt).toISOString(), pid: process.pid });
const log = value => appendFileSync(join(runDir, "events.ndjson"), JSON.stringify({ at: Date.now(), ...value }) + "\n");
const project = join(homedir(), "Developer", "scratch", `pi-goal-qwen-${basename(matrixDir)}-${number}`);
const agentDir = join(runDir, "agent");
const controller = new AbortController();
let host, session, failure, latestGoal, completeGoal, manualPending, boundaryPending, executorResponses = 0, extensionRecoveries = 0, awaitingRecovery = false, requestCount = 0;
const compactions = [], transitions = [], responses = [], responsePromises = [];
const finishedTasks = new Set();
let lastActivity = Date.now();
function fail(error) {
	if (!failure) { failure = error instanceof Error ? error : new Error(String(error)); log({ type: "failure", message: failure.message }); }
	controller.abort();
	void session?.abort().catch(() => {});
}
const deadline = setTimeout(() => fail(new Error(`${manifest.limits.elapsedMs / 60000}-minute run limit reached`)), manifest.limits.elapsedMs);
async function compactAtBoundary(boundary) {
	try {
		await session.compact();
		assert(!boundaryPending, `manual boundary ${boundary.task} did not produce a successful native summary`);
		if (failure) throw failure;
		// compact() uses Pi's public abort. If that paused the goal, resume through
		// the existing user command; no goal record or execution flag is rewritten.
		await session.prompt("/goal-resume");
	} catch (error) { fail(error); }
	finally { manualPending = undefined; lastActivity = Date.now(); }
}

try {
	assert.equal(process.version, manifest.node, "use the frozen Node version");
	assert.equal(VERSION, manifest.pi, "use the frozen Pi version");
	for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert.equal(hash(readFileSync(join(repo, file))), digest, `changed driver source: ${file}`);
	for (const [file, digest] of Object.entries(manifest.fixtureFiles)) assert.equal(hash(readFileSync(join(matrixDir, file))), digest, `changed fixture: ${file}`);
	assert.equal(hash(readFileSync(manifest.artifact)), manifest.artifactSha256);
	assert.equal(hash(readFileSync(manifest.modelsPath)), manifest.modelsSha256, "model configuration changed after freeze");
	for (const [file, digest] of Object.entries(manifest.packedFiles)) {
		assert.equal(hash(readFileSync(join(manifest.installedPackage, file))), digest, `installed package changed: ${file}`);
		if (file.startsWith("extensions/")) assert.equal(hash(readFileSync(join(repo, file))), digest, `candidate helper source changed: ${file}`);
	}
	assert(!existsSync(project), "preserve earlier trial projects");
	mkdirSync(project, { recursive: true });
	mkdirSync(agentDir);
	writeFileSync(join(project, "input.csv"), readFileSync(join(matrixDir, `input-${scheduled.seed}.csv`)));
	writeFileSync(join(project, "TASK.md"), readFileSync(join(matrixDir, "objective.txt")));
	process.chdir(project);
	for (const name of Object.keys(process.env)) if (name.startsWith("PI_GOAL_")) delete process.env[name];
	for (const name of ["HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy"]) delete process.env[name];
	process.env.PI_OFFLINE = "1";
	process.env.PI_CODING_AGENT_DIR = agentDir;
	process.env.PI_GOAL_GLOBAL_SETTINGS_FILE = join(agentDir, "goal-settings.json");
	process.env.PI_GOAL_AUTO_CONFIRM = "1";
	process.env.PI_GOAL_DISABLE_TASKS = "0";
	process.env.PI_GOAL_DISABLE_CONTRACTS = "0";
	process.env.PI_GOAL_NETWORK_RECOVERY_MAX_ATTEMPTS = "2";
	process.env.PI_GOAL_NETWORK_RECOVERY_MAX_DELAY_MS = "5000";
	process.env.PI_SUBAGENT_CHILD = "";
	process.env.PI_SUBAGENT_DEPTH = "";
	writeJson(process.env.PI_GOAL_GLOBAL_SETTINGS_FILE, { provider: manifest.provider, model: scheduled.model, thinkingLevel: scheduled.thinking, disabled: false, disableTasks: false, disableContracts: false, oracle: { enabled: false }, networkRecovery: { maxAttempts: 2, maxDelayMs: 5000 } });
	const runtime = await ModelRuntime.create({ authPath: join(agentDir, "auth.json"), modelsPath: manifest.modelsPath, allowModelNetwork: false, refreshOnCreate: false });
	if (runtime.getError()) throw new Error(runtime.getError());
	const model = runtime.getModel(manifest.provider, scheduled.model);
	assert(model, `unavailable configured model: ${scheduled.model}`);
	assert.equal(model.contextWindow, manifest.contextWindow);
	assert.equal(model.maxTokens, manifest.maxOutput);
	assert.equal(model.baseUrl, manifest.modelConfiguration.baseUrl);
	const stream = runtime.streamSimple.bind(runtime);
	runtime.streamSimple = (requestedModel, context, options = {}) => {
		if (failure) throw failure;
		const role = context.tools?.some(tool => tool.name === "get_goal") ? "executor" : context.tools?.length ? "auditor" : "summary";
		if (role === "executor") {
			if (executorResponses >= manifest.limits.executorResponses) { fail(new Error("60 executor-response limit reached")); throw failure; }
			executorResponses++;
		}
		assert.equal(requestedModel.provider, manifest.provider);
		assert.equal(requestedModel.id, scheduled.model);
		const request = ++requestCount;
		log({ type: "request_context", request, role, contextWindow: requestedModel.contextWindow, contextUsage: session?.getContextUsage(), compaction: session?.settingsManager.getCompactionSettings() });
		const result = stream(requestedModel, context, { ...options, signal: AbortSignal.any([controller.signal, ...(options.signal ? [options.signal] : [])]),
			maxTokens: Math.min(options.maxTokens ?? manifest.maxOutput, manifest.maxOutput), temperature: manifest.temperature,
			onPayload: async (payload, sentModel) => {
				const body = await options.onPayload?.(payload, sentModel) ?? payload;
				assert(body && typeof body === "object");
				body.top_p = manifest.topP;
				assert.equal(body.model, scheduled.model);
				assert(body.max_tokens > 0 && body.max_tokens <= manifest.maxOutput);
				log({ type: "request", request, role, payload: body });
				return body;
			},
			onResponse: async (response, sentModel) => { log({ type: "http", request, role, status: response.status }); await options.onResponse?.(response, sentModel); },
		});
		responsePromises.push(result.result().then(message => { responses.push({ request, role, usage: message.usage, stopReason: message.stopReason }); log({ type: "response", request, role, message }); }));
		return result;
	};
	const settingsManager = SettingsManager.inMemory({ compaction: manifest.compaction, retry: { enabled: true, maxRetries: 2 } });
	const resourceLoader = new DefaultResourceLoader({ cwd: project, agentDir, settingsManager, additionalExtensionPaths: [manifest.installedPackage],
		noSkills: true, noPromptTemplates: true, noThemes: true, noContextFiles: true,
		systemPrompt: "Carry out the user's synthetic CSV development goal using the files in this project. Preserve its requirements and use real tools to verify your work.",
		extensionFactories: [pi => {
			pi.on("tool_result", async event => {
				log({ type: "public_tool_result", event });
				if (!event.details?.goal) return;
				latestGoal = structuredClone(event.details.goal);
				for (const id of finishedTasks) if (!latestGoal.taskList?.tasks.some(task => task.id === id && task.status === "complete")) finishedTasks.delete(id);
				for (const task of latestGoal.taskList?.tasks ?? []) {
					if (task.status !== "complete") { finishedTasks.delete(task.id); continue; }
					if (finishedTasks.has(task.id)) continue;
					finishedTasks.add(task.id);
					transitions.push({ task: task.id, at: Date.now(), response: executorResponses, tool: event.toolName });
					const boundary = manifest.boundaries.find(item => item.task === task.id);
					if (!boundary) continue;
					if (boundaryPending) { fail(new Error("multiple compaction milestones completed before the prior boundary")); return; }
					boundaryPending = boundary;
					if (boundary.reason === "manual") manualPending = boundary;
					else {
						log({ type: "ballast", task: task.id, ...manifest.ballast });
						// A real tool-result tail reaches Pi's next-response threshold check;
						// context-only custom messages may wait until the whole run settles.
						return { content: [...event.content, { type: "text", text: ballast }] };
					}
				}
				if (latestGoal.status === "complete") completeGoal = latestGoal;
				if (["blocked", "budget_limited"].includes(latestGoal.status)) fail(new Error(`executor stopped with ${latestGoal.status}`));
			});
			pi.on("turn_end", () => {
				if (manualPending && !manualPending.started) {
					manualPending = { ...manualPending, started: true };
					void compactAtBoundary(manualPending);
				}
			});
			pi.on("session_compact", event => {
				const record = { reason: event.reason, success: event.success, fromExtension: event.fromExtension, entry: event.compactionEntry, boundary: boundaryPending, at: Date.now(), executorResponses };
				compactions.push(record); log({ type: "native_compaction", ...record });
				if (event.success === false || !event.compactionEntry?.summary || event.fromExtension) { fail(new Error("native model-generated compaction failed")); return; }
				if (boundaryPending) {
					if (event.reason !== boundaryPending.reason) { fail(new Error("wrong native compaction path at milestone")); return; }
					boundaryPending = undefined;
				}
			});
			pi.on("session_compact_failed", event => fail(new Error(`native ${event.reason} compaction failed: ${event.errorMessage ?? "cancelled"}`)));
		}],
	});
	await resourceLoader.reload({ resolveProjectTrust: async () => true });
	assert.deepEqual(resourceLoader.getExtensions().errors, []);
	assert.equal(resourceLoader.getExtensions().extensions.filter(extension => extension.commands.has("goal")).length, 1);
	assert.equal(resourceLoader.getExtensions().extensions.length, 2, "one goal package and the passive acceptance observer");
	host = await createAgentSessionRuntime(async ({ sessionManager, sessionStartEvent }) => {
		const created = await createAgentSession({ cwd: project, agentDir, modelRuntime: runtime, model, thinkingLevel: scheduled.thinking, resourceLoader, sessionManager, settingsManager, sessionStartEvent });
		session = created.session;
		await session.bindExtensions({ onError: error => fail(new Error(error.error)) });
		return { ...created, services: { cwd: project, agentDir, modelRuntime: runtime, settingsManager, resourceLoader, diagnostics: [] }, diagnostics: [] };
	}, { cwd: project, agentDir, sessionManager: SessionManager.create(project, join(agentDir, "sessions")) });
	session.subscribe(event => {
		if (["agent_start", "agent_end", "agent_settled", "compaction_start", "compaction_end", "auto_retry_start", "auto_retry_end", "tool_execution_start", "tool_execution_end"].includes(event.type)) { lastActivity = Date.now(); log({ type: "session_event", event }); }
		if (event.type === "agent_start" && awaitingRecovery && !manualPending) {
			awaitingRecovery = false;
			if (++extensionRecoveries > manifest.limits.extensionRecoveries) fail(new Error("two extension-recovery limit reached"));
		}
		if (event.type === "agent_end" && !event.willRetry && !manualPending && !failure) {
			const last = event.messages.findLast(message => message.role === "assistant");
			awaitingRecovery = isNetworkErrorAssistantMessage(last) || isAbortedAssistantMessage(last);
			if (last?.stopReason === "error" && !awaitingRecovery) fail(new Error(`provider error: ${last.errorMessage}`));
		}
	});
	await session.prompt(`/goal-direct ${objective}`);
	while (!completeGoal && !failure) {
		if (!manualPending && !awaitingRecovery && session.isIdle && session.pendingMessageCount === 0 && Date.now() - lastActivity > 5000) fail(new Error("executor yielded before completing the frozen goal"));
		await new Promise(resolve => setTimeout(resolve, 50));
	}
	if (failure) throw failure;
	await session.waitForIdle();
	await host.dispose(); host = undefined;
	await Promise.all(responsePromises);
	assert.equal(completeGoal.latestReview?.outcome, "approved", "audited completion is required");
	for (const milestone of milestones) {
		const task = completeGoal.taskList.tasks.find(task => task.id === milestone.id);
		assert(task && task.status === "complete" && task.evidence?.trim(), `incomplete milestone: ${milestone.id}`);
		assert.equal(task.verificationContract, milestone.contract);
		assert.equal(transitions.filter(transition => transition.task === milestone.id).length, 1, `duplicate completed transition: ${milestone.id}`);
	}
	assert.deepEqual(compactions.filter(item => item.boundary).map(item => ({ task: item.boundary.task, reason: item.reason })), manifest.boundaries);
	assert.equal(hash(readFileSync(join(project, "input.csv"))), manifest.fixtureFiles[`input-${scheduled.seed}.csv`]);
	assert.equal(hash(readFileSync(join(project, "TASK.md"))), manifest.fixtureFiles["objective.txt"]);
	const expected = readJson(join(matrixDir, `expected-${scheduled.seed}.json`));
	for (const key of ["normalized", "totals", "rejections"]) assert.deepEqual(readJson(join(project, "output", `${key}.json`)), expected[key]);
	const probe = readJson(join(matrixDir, "probe.json")), probeInput = join(runDir, "independent-input.csv"), probeOutput = join(runDir, "independent-output");
	writeFileSync(probeInput, probe.csv);
	const checkOptions = { cwd: project, signal: controller.signal, timeout: 15000, maxBuffer: 4 * 1024 * 1024 };
	const normalized = await promisify(execFile)(process.execPath, [join(project, "normalize.mjs"), probeInput, probeOutput], checkOptions);
	log({ type: "independent_normalizer", stdout: normalized.stdout, stderr: normalized.stderr });
	for (const key of ["normalized", "totals", "rejections"]) assert.deepEqual(readJson(join(probeOutput, `${key}.json`)), probe.expected[key]);
	assert(readdirSync(project, { recursive: true }).some(name => name.endsWith(".test.mjs")), "an executable Node test file is required");
	const checks = await promisify(execFile)(process.execPath, ["--test"], checkOptions);
	log({ type: "executor_checks", stdout: checks.stdout, stderr: checks.stderr });
	const readme = readFileSync(join(project, "README.md"), "utf8");
	for (const term of ["normalize.mjs", "node --test", "duplicate", "amount", "category"]) assert(readme.toLowerCase().includes(term.toLowerCase()), `documentation omits ${term}`);
	const stored = readdirSync(join(project, ".pi/goals"), { recursive: true }).filter(name => name.endsWith(".md")).map(name => parseGoalFile(join(project, ".pi/goals", name))).filter(goal => goal?.id === completeGoal.id);
	assert.equal(stored.length, 1, "one authoritative archived completed record is required");
	assert.equal(stored[0].status, "complete");
	assert.equal(stored[0].latestReview?.outcome, "approved");
	assert(stored[0].archivedPath?.startsWith(".pi/goals/archived/"));
	assert(Date.now() - startedAt <= manifest.limits.elapsedMs);
} catch (error) { fail(error); }
finally {
	await host?.dispose().catch(error => fail(error));
	await Promise.allSettled(responsePromises);
	clearTimeout(deadline);
	const status = failure ? "FAIL" : "PASS";
	const usageByRole = Object.fromEntries(["executor", "summary", "auditor"].map(role => {
		const usage = responses.filter(response => response.role === role).map(response => response.usage);
		return [role, Object.fromEntries(["input", "output", "cacheRead", "cacheWrite", "reasoning", "totalTokens"].filter(key => usage.some(item => typeof item?.[key] === "number")).map(key => [key, usage.reduce((sum, item) => sum + (item?.[key] ?? 0), 0)]))];
	}));
	const report = { ...scheduled, kind: manifest.kind, status: manifest.kind === "D6-real-Qwen" ? status : `REHEARSAL_${status}`, error: failure?.message, startedAt: new Date(startedAt).toISOString(), elapsedMs: Date.now() - startedAt,
		artifactSha256: manifest.artifactSha256, sourceCommit: manifest.sourceCommit, node: process.version, pi: manifest.pi, project, runDir,
		requestCount, executorResponses, extensionRecoveries, usageByRole, responses, compactions, transitions, finalGoal: completeGoal ?? latestGoal };
	writeJson(join(runDir, "result.json"), report);
	console.log(JSON.stringify({ number, model: scheduled.model, thinking: scheduled.thinking, status: report.status, error: report.error, elapsedMs: report.elapsedMs, executorResponses, extensionRecoveries, result: join(runDir, "result.json") }));
	process.exitCode = failure ? 1 : 0;
}
