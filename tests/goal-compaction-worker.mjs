/** S1 compaction proof: public task tools, real summaries and host recovery. */
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";
import { AssistantMessageEventStream } from "@earendil-works/pi-ai";
import { createAgentSession, DefaultResourceLoader, ModelRuntime, SessionManager, SettingsManager } from "@earendil-works/pi-coding-agent";

const mode = process.argv[2] ?? "manual";
const baseline = process.argv.includes("--baseline");
const stopState = process.argv.find(a => a.startsWith("--stopped="))?.split("=")[1] ?? "paused";
const long = process.argv.includes("--long");
const adviceReview = process.argv.includes("--advice-review");
const review = adviceReview || process.argv.includes("--audit-only");
const stall = process.argv.includes("--stall");
const realNow = Date.now;
let clockOffset = 0;
if (stall) Date.now = () => realNow() + clockOffset;
assert(["manual", "threshold", "overflow"].includes(mode));
const work = mkdtempSync(join(tmpdir(), "goal-compaction-"));
const cwd = join(work, "project"), agentDir = join(work, "agent");
mkdirSync(cwd); mkdirSync(agentDir);
process.env.PI_OFFLINE = "1";
process.env.PI_CODING_AGENT_DIR = agentDir;
process.env.PI_GOAL_GLOBAL_SETTINGS_FILE = join(agentDir, "goal-settings.json");
process.env.PI_GOAL_AUTO_CONFIRM = "1";
mkdirSync(join(cwd, ".pi"));
writeFileSync(join(cwd, ".pi", "pi-goal-x-settings.json"), JSON.stringify(review
	? { provider: "fixture", model: "reviewer", disabled: false, oracle: { enabled: adviceReview, provider: "fixture", model: "reviewer" } }
	: { disabled: true, ...(stall ? { stallTimeoutMinutes: 1 } : {}) }));
const manager = SessionManager.create(cwd, join(work, "sessions"));
const settings = SettingsManager.inMemory({ compaction: { enabled: mode !== "manual", reserveTokens: 16384, keepRecentTokens: 2000 }, retry: { enabled: false } });
const results = [], compactions = [], summaries = [], projections = [], errors = [], childRequests = [];
const advice = { diagnosis: `oracle-step-sentinel ${"Diagnosis. ".repeat(170)}`, alternatives: [{ title: "Inspect the existing evidence", rationale: "Recovery path. ".repeat(60), steps: Array(8).fill("Read the fixture evidence. ".repeat(14)), expectedEvidence: ["proof-0"] }], recommendedIndex: 0, unresolvedQuestions: [], disposition: "actionable" };
const server = http.createServer(async (req, res) => {
	let body = "";
	for await (const chunk of req) body += chunk;
	const payload = JSON.parse(body);
	childRequests.push(payload);
	res.writeHead(200, { "content-type": "text/event-stream" });
	const oracle = payload.tools?.some(tool => tool.function.name === "submit_goal_oracle_advice");
	const submit = oracle && !payload.messages.some(message => message.role === "tool");
	const delta = submit ? { role: "assistant", tool_calls: [{ index: 0, id: "oracle-submit", type: "function", function: { name: "submit_goal_oracle_advice", arguments: JSON.stringify(advice) } }] }
		: { role: "assistant", content: oracle ? "Advice recorded." : `audit-objection-sentinel ${"Preserve every task contract. ".repeat(1000)}\n<disapproved/>` };
	for (const [d, finish_reason] of [[delta, null], [{}, submit ? "tool_calls" : "stop"]]) res.write(`data: ${JSON.stringify({ id: "fixture", object: "chat.completion.chunk", created: 1, model: "reviewer", choices: [{ index: 0, delta: d, finish_reason }] })}\n\n`);
	res.end("data: [DONE]\n\n");
});
let session, deadline, failure, manualCompaction;
let current = null, completed = 0, executorRequests = 0, beforeStarts = 0, run = 0;
let stoppedProbe = false;
const pauseReason = `pause-reason-sentinel ${"preserved reason ".repeat(2000)}`;
const pauseAction = `pause-action-sentinel ${"preserved action ".repeat(2000)}`;
let resolveFinished;
const finished = new Promise(resolve => { resolveFinished = resolve; });
const steps = [{ name: "set_goal_tasks", args: {
	tasks: Array.from({ length: 50 }, (_, i) => ({ id: `t${i + 1}`, ...(i >= 39 && i <= 41 ? { parent_id: "t39" } : {}), title: `Fixture task ${i + 1}${long ? " title data".repeat(2000) : ""}`, verification_contract: `Evidence for task ${i + 1} must match its artifact.${long ? " contract data".repeat(2000) : ""}` })), block_completion: stopState !== "complete" && !review,
} }];
const objective = `Preserve the public fixture plan and its completed evidence through three compactions.${long ? " objective data".repeat(2000) : ""}\nVerification contract: unique-goal-contract-sentinel ${long ? "verification data ".repeat(2000) : "Preserve all completed evidence."}`;
if (stopState === "budget_limited") steps.unshift({ name: "create_goal", args: { objective, token_budget: 100000 } });
for (let cycle = 0; cycle < 3; cycle++) {
	steps.push(
		{ name: "write", args: { path: `evidence-${cycle}.txt`, content: `proof-${cycle}` } },
		{ name: "update_goal_task", args: { task_id: `t${cycle + 1}`, status: "complete", evidence: `evidence-${cycle}.txt contains proof-${cycle}` } },
		{ name: "update_goal_task", args: { task_id: `t${40 + cycle}`, status: "start" } },
		{ name: "fixture_padding", args: {} },
		...(adviceReview && cycle === 0 ? [{ name: "update_goal", args: { status: "blocked", reason: "The same fixture blocker recurred over three turns." } }] : []),
		...(review && cycle === 0 ? [{ name: "update_goal", args: { status: "complete" } }] : []),
		...(mode === "manual" ? [{ manualBoundary: true }] : mode === "overflow" ? [{ overflow: true }] : []),
		{ name: "read", args: { path: `evidence-${cycle}.txt` }, afterCompaction: cycle + 1 },
	);
}
steps.push({ name: "get_goal", args: { verbose: true }, input: stopState === "budget_limited" ? 100001 : 100 });
if (stopState === "budget_limited") steps.push({ budgetWrap: true });
else if (stopState === "blocked") steps.push({ name: "update_goal", args: { status: "blocked", reason: pauseReason } });
else steps.push({ name: "update_goal", args: { status: stopState === "complete" ? "complete" : "paused", reason: pauseReason, suggested_action: pauseAction } });
const loader = new DefaultResourceLoader({
	cwd, agentDir, settingsManager: settings, noSkills: true, noPromptTemplates: true, noThemes: true, noContextFiles: true,
	systemPrompt: "Perform the authorized synthetic fixture.",
	additionalExtensionPaths: [process.env.PI_GOAL_TEST_EXTENSION ?? fileURLToPath(new URL("../extensions/goal.ts", import.meta.url))],
	extensionFactories: [pi => {
		pi.on("before_agent_start", () => { beforeStarts++; });
		pi.on("agent_start", () => { run++; });
		pi.on("tool_result", event => {
			results.push(event);
			if (event.toolName === "update_goal_task" && event.input.status === "start") current = event.input.task_id;
			if (event.toolName === "update_goal_task" && event.input.status === "complete") completed++;
		});
		pi.on("session_compact", event => {
			compactions.push({ reason: event.reason, run, request: executorRequests, success: event.success });
			if (stall && compactions.length === 1) clockOffset += 61000;
		});
		pi.registerTool({ name: "fixture_padding", label: "Fixture padding", description: "Deterministic non-instructional context ballast.", parameters: { type: "object", properties: {} },
			execute: async () => ({ content: [{ type: "text", text: "00112233445566778899 ".repeat(mode === "threshold" ? 250 : 5000) }], details: {} }),
		});
	}],
});
function message(model, content, stopReason, input = 100) {
	const value = { role: "assistant", api: model.api, provider: model.provider, model: model.id, content, usage: { input, output: 10, cacheRead: 0, cacheWrite: 0, totalTokens: input + 10, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } }, stopReason, timestamp: Date.now() };
	if (stopReason === "error") value.errorMessage = "maximum context length exceeded";
	const stream = new AssistantMessageEventStream();
	stream.push({ type: "start", partial: value });
	stream.push(stopReason === "error" ? { type: "error", reason: "error", error: value } : { type: "done", reason: stopReason, message: value });
	return stream;
}
function automaticText(context) {
	return context.messages.filter(m => m.role === "user").flatMap(m => m.content.filter(c => c.type === "text").map(c => c.text)).filter(t => t.startsWith("[PI GOAL") || t.startsWith("<pi_goal_continuation")).join("");
}
try {
	if (review) await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
	await loader.reload({ resolveProjectTrust: async () => true });
	assert.deepEqual(loader.getExtensions().errors, []);
	assert.equal(loader.getExtensions().extensions.length, 2);
	const runtime = await ModelRuntime.create({ authPath: join(agentDir, "auth.json"), modelsPath: null, allowModelNetwork: false, refreshOnCreate: false });
	await runtime.setRuntimeApiKey("openai", "synthetic-unused");
	if (review) runtime.registerProvider("fixture", { baseUrl: `http://127.0.0.1:${server.address().port}/v1`, api: "openai-completions", apiKey: "synthetic-unused", models: [{ id: "reviewer", name: "Reviewer", reasoning: false, input: ["text"], contextWindow: 65536, maxTokens: 8192, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } }] });
	const model = { id: "synthetic", name: "Synthetic", provider: "openai", api: "openai-completions", baseUrl: "http://127.0.0.1:1", reasoning: false, input: ["text"], contextWindow: 65536, maxTokens: 8192, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } };
	({ session } = await createAgentSession({ cwd, agentDir, modelRuntime: runtime, model, thinkingLevel: "off", resourceLoader: loader, sessionManager: manager, settingsManager: settings }));
	await session.bindExtensions({ onError: error => { errors.push(error); } });
	let pendingManual = false;
	session.subscribe(event => {
		if (event.type !== "agent_settled") return;
		if (failure || steps.length === 0) resolveFinished();
		else if (pendingManual) {
			pendingManual = false;
			manualCompaction = session.compact().catch(error => { failure = error; resolveFinished(); });
		}
	});
	session.agent.streamFunction = (requestedModel, context) => {
		if (!context.tools?.length) {
			summaries.push(JSON.parse(JSON.stringify(context)));
			assert(!JSON.stringify(context).includes("[PI GOAL ACTIVE"), "ephemeral projection must not enter the separate summarizer");
			return message(requestedModel, [{ type: "text", text: "Earlier synthetic work occurred. Preserve fixture-unrelated-sentinel. Task identity and completion details were deliberately omitted." }], "stop");
		}
		if (stoppedProbe) {
			const automatic = [automaticText(context)];
			try {
				assert(automatic.join("").length <= 10000, `aggregate automatic goal text is ${automatic.join("").length} chars`);
				if (stopState !== "complete") assert(automatic.join("").includes(`PI GOAL ${stopState.toUpperCase().replace("_", " ")}`));
				if (!["complete", "unfocused"].includes(stopState)) {
					assert.match(automatic.join(""), /unique-goal-contract-sentinel/);
					assert.match(automatic.join(""), /Current: t42/);
					assert.match(automatic.join(""), /Ancestors: t39/);
					assert.match(automatic.join(""), /3\/50 tasks complete/);
				}
				if (stopState === "paused" || stopState === "blocked") {
					assert.match(automatic.join(""), /pause-reason-sentinel/);
					assert.match(automatic.join(""), /get_goal\(section="history"\)/);
				}
				if (stopState === "paused") {
					assert.match(automatic.join(""), /pause-action-sentinel/);
					assert.match(automatic.join(""), /Do not autonomously continue/);
				}
				if (stopState === "budget_limited") assert.match(automatic.join(""), /Do not start new substantive work/);
				if (review) assert.match(automatic.join(""), /audit-objection-sentinel/);
				assert(!automatic.join("").includes("PI GOAL ACTIVE"));
			} catch (error) { failure = error; }
			return message(requestedModel, [{ type: "text", text: "The goal remains paused." }], "stop");
		}
		executorRequests++;
		const step = steps.shift();
		try {
			assert(step, "no duplicate/unplanned executor response");
			assert(automaticText(context).length <= 10000, `aggregate automatic goal text is ${automaticText(context).length} chars`);
			const projection = context.messages.at(-1);
			const text = JSON.stringify(projection);
			projections.push({ request: executorRequests, run, current, completed, text });
			if (step.afterCompaction) assert.equal(compactions.length, step.afterCompaction, "work must cross the intended native compaction boundary");
			if (stall && step.afterCompaction === 1) assert.match(text, /GOAL STALLED/, "inactivity steering must reach the first executor request after the idle interval");
			if (review && step.afterCompaction === 1) {
				if (adviceReview) assert.match(text, /oracle-step-sentinel/);
				assert.match(text, /audit-objection-sentinel/);
			}
			if (step.budgetWrap) assert.match(text, /TOKEN BUDGET REACHED/);
			if ((!baseline || step.afterCompaction) && !step.budgetWrap) {
				assert(!context.systemPrompt.includes("[PI GOAL"), "dynamic state must not be trapped in system context");
				if (current) assert(text.includes(`Current: ${current}`), `current task ${current} must survive mutation/compaction; public result: ${JSON.stringify(results.findLast(r => r.toolName === "update_goal_task")?.details.goal.currentTaskId)}`);
				if (current) assert(text.includes("Ancestors: t39"));
				if (completed) assert(text.includes(`${completed}/50 tasks complete`), "completed tasks remain complete");
				if (current) assert(text.includes(`Evidence for task ${current.slice(1)} must match its artifact.`), "current contract survives compaction");
			}
			assert(JSON.stringify(context.messages).includes("fixture-unrelated-sentinel"), "unrelated extension context survives goal filtering");
			const calls = new Set();
			for (const message of context.messages) {
				if (message.role === "assistant") { for (const block of message.content) if (block.type === "toolCall") calls.add(block.id); }
				else if (message.role === "toolResult") assert(calls.delete(message.toolCallId), "native tool result retains its preceding call");
			}
			assert.equal(calls.size, 0, "no unpaired calls reach the next provider request");
		} catch (error) { failure = error; }
		if (failure) return message(requestedModel, [{ type: "text", text: "Fixture failed." }], "stop");
		if (step.budgetWrap) return message(requestedModel, [{ type: "text", text: "One budget wrap-up; waiting for the user." }], "stop");
		if (step.manualBoundary) {
			pendingManual = true;
			return message(requestedModel, [{ type: "text", text: "Ready for manual compaction." }], "stop");
		}
		if (step.overflow) return message(requestedModel, [], "error");
		return message(requestedModel, [{ type: "toolCall", id: `call-${executorRequests}`, name: step.name, arguments: step.args }], "toolUse", step.input ?? (mode === "threshold" && step.name === "fixture_padding" ? 56000 : 100));
	};
	deadline = setTimeout(() => { failure ??= new Error("compaction fixture timed out"); void session.abort(); resolveFinished(); }, 15000);
	await session.sendCustomMessage({ customType: "fixture-unrelated", content: "fixture-unrelated-sentinel", display: false }, { triggerTurn: false });
	await session.prompt(stopState === "budget_limited" ? `Create a persistent goal with 100000 tokens: ${objective}` : `/goal-direct ${objective}`);
	await finished;
	await manualCompaction;
	if (failure) { console.error(JSON.stringify({ mode, compactions, errors, lastResult: results.at(-1), projections: projections.slice(-3) })); throw failure; }
	assert.deepEqual(errors, []);
	assert.deepEqual(results.filter(r => r.isError), []);
	assert.deepEqual(compactions.map(c => c.reason), Array(3).fill(mode));
	assert(summaries.length >= 3, "native compactions must actually request summaries");
	assert(summaries.every(s => !JSON.stringify(s.systemPrompt).includes("[PI GOAL ACTIVE")));
	assert.equal(beforeStarts, stopState === "budget_limited" ? 1 : 0, "custom continuation proof cannot rely on a user-start hook");
	assert.equal(steps.length, 0);
	const finalGoal = results.find(r => r.toolName === "get_goal").details.goal;
	assert.equal(finalGoal.currentTaskId, "t42");
	assert.equal(finalGoal.taskList.tasks.flatMap(task => [task, ...(task.subtasks ?? [])]).length, 50);
	assert.deepEqual(finalGoal.taskList.tasks.filter(t => t.status === "complete").map(t => t.id), ["t1", "t2", "t3"]);
	for (let c = 0; c < 3; c++) assert.equal(readFileSync(join(cwd, `evidence-${c}.txt`), "utf8"), `proof-${c}`);
	assert(!manager.getEntries().some(e => e.customType === "pi-goal-context"));
	const checkpoints = manager.getEntries().filter(e => e.type === "custom_message" && e.customType === "pi-goal-event");
	assert(checkpoints.every(e => e.content.length <= 160));
	assert.equal(checkpoints.length, mode === "manual" ? 5 : 2, "overflow retries belong to the host; no extension checkpoint duplicates them");
	if (mode === "threshold") assert(compactions.every(c => projections.some(p => p.request > c.request && p.run === c.run)), "threshold compaction must happen between responses within a run");
	if (stopState === "unfocused") await session.prompt("/goal-unfocus");
	await session.sendCustomMessage({ customType: "fixture-unrelated", content: "Stopped-state ballast ".repeat(1000), display: false }, { triggerTurn: false });
	await session.sendCustomMessage({ customType: "fixture-unrelated", content: "Stopped-state inspection boundary: fixture-unrelated-sentinel", display: false }, { triggerTurn: false });
	await session.compact();
	assert.equal(compactions.length, 4, "paused goal also crosses a native compaction");
	stoppedProbe = true;
	await session.prompt("Report the goal's paused state without resuming work.");
	if (failure) throw failure;
	assert.equal(results.filter(r => r.toolName === "write").length, 3);
	assert.equal(manager.getEntries().filter(e => e.type === "custom_message" && e.customType === "pi-goal-event").length, checkpoints.length, "compacting a paused goal cannot start a checkpoint");
	if (review) {
		assert(childRequests.length >= (adviceReview ? 3 : 1));
		for (const payload of childRequests) {
			assert(!JSON.stringify(payload).includes("PI GOAL ACTIVE"), "separate reviewer/Oracle requests contain no executor projection");
			assert(!payload.tools?.some(tool => ["create_goal", "get_goal", "set_goal_tasks", "update_goal_task", "update_goal"].includes(tool.function.name)));
			if (payload.tools?.some(tool => tool.function.name === "submit_goal_oracle_advice")) assert(!payload.tools.some(tool => ["bash", "edit", "write"].includes(tool.function.name)));
		}
	}
	console.log(JSON.stringify({ passed: true, mode, stopState, executorRequests, summaries: summaries.length, compactions, completed, current, effects: results.filter(r => r.toolName === "write").length }));
} finally {
	clearTimeout(deadline);
	await session?.abort(); session?.dispose();
	server.closeAllConnections();
	await new Promise(resolve => server.close(resolve));
	Date.now = realNow;
	rmSync(work, { recursive: true, force: true });
}
