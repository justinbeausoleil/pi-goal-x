/** S1: real loader and lifecycle, deterministic provider, observable work effects. */
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { AssistantMessageEventStream } from "@earendil-works/pi-ai";
import { createAgentSession, DefaultResourceLoader, ModelRuntime, SessionManager, SettingsManager } from "@earendil-works/pi-coding-agent";
import { parseGoalFile } from "../extensions/storage/goal-files.ts";

const mode = process.argv[2] ?? "goal-direct";
const controlledClock = process.argv.includes("--clock");
const originalNow = Date.now;
let clockNow = originalNow();
if (controlledClock) Date.now = () => clockNow;
const work = mkdtempSync(join(tmpdir(), "goal-lifecycle-"));
const cwd = join(work, "project");
const agentDir = join(work, "agent");
mkdirSync(cwd);
mkdirSync(agentDir);
process.env.PI_OFFLINE = "1";
process.env.PI_CODING_AGENT_DIR = agentDir;
process.env.PI_GOAL_GLOBAL_SETTINGS_FILE = join(agentDir, "goal-settings.json");
const guided = mode === "goal" || mode === "sisyphus";
const budget = mode === "budget-wrapup";
const explicit = mode === "create_goal" || budget;
const ordered = mode.startsWith("sisyphus");
const rejected = mode.startsWith("reject-");
const objective = ordered
	? "1) Create proof.txt containing SYNTHETIC_OBJECTIVE_4f927. Done when the file exists.\n2) Read proof.txt. Done when its exact content is verified."
	: "Create proof.txt containing SYNTHETIC_OBJECTIVE_4f927, then read it back.";
const captures = [];
const results = [];
let starts = 0;
let session;
let deadline;
let failure;
let confirmations = 0;
let action = "startup";
let actionRequests = 0;
const manager = SessionManager.create(cwd, join(work, "sessions"));
const settings = SettingsManager.inMemory({ compaction: { enabled: false }, retry: { enabled: false } });
const loader = new DefaultResourceLoader({
	cwd, agentDir, settingsManager: settings,
	noSkills: true, noPromptTemplates: true, noThemes: true, noContextFiles: true,
	systemPrompt: "Perform the authorized synthetic fixture.",
	additionalExtensionPaths: [process.env.PI_GOAL_TEST_EXTENSION ?? fileURLToPath(new URL("../extensions/goal.ts", import.meta.url))],
	extensionFactories: [pi => {
		pi.on("before_agent_start", () => { starts++; });
		pi.on("tool_result", event => {
			results.push(event);
			if (controlledClock && ["create_goal", "propose_goal_draft"].includes(event.toolName) && event.details?.goal) clockNow += 8000;
		});
	}],
});
try {
	await loader.reload({ resolveProjectTrust: async () => true });
	assert.deepEqual(loader.getExtensions().errors, []);
	assert.equal(loader.getExtensions().extensions.length, 2, "only the goal extension and deterministic observer load");
	const runtime = await ModelRuntime.create({ authPath: join(agentDir, "auth.json"), modelsPath: null, allowModelNetwork: false, refreshOnCreate: false });
	await runtime.setRuntimeApiKey("openai", "synthetic-unused");
	const model = { id: "synthetic", name: "Synthetic", provider: "openai", api: "openai-completions", baseUrl: "http://127.0.0.1:1", reasoning: false, input: ["text"], contextWindow: 65536, maxTokens: 8192, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } };
	({ session } = await createAgentSession({ cwd, agentDir, modelRuntime: runtime, model, thinkingLevel: "off", resourceLoader: loader, sessionManager: manager, settingsManager: settings }));
	await session.bindExtensions({
		onError: error => { failure = new Error(error.error); },
		...(guided ? { mode: "rpc", uiContext: {
			notify() {}, setStatus() {}, setWidget() {}, setEditorText() {},
			onTerminalInput: () => () => {},
			select: async (_title, choices) => { confirmations++; return choices[0]; },
			confirm: async () => true,
		} } : {}),
	});
	let resolveFinished;
	const finished = new Promise(resolve => { resolveFinished = resolve; });
	session.subscribe(event => { if (event.type === "agent_settled" && (failure || results.some(r => r.toolName === "update_goal") || (budget && captures.length === 3))) resolveFinished(); });
	session.agent.streamFunction = (_model, context) => {
		captures.push(JSON.parse(JSON.stringify(context)));
		const step = captures.length - (guided || explicit ? 1 : 0);
		try {
			assert(captures.length <= 8, "bounded deterministic startup fixture");
			if (action === "startup") {
				assert(step <= 4, "bounded startup");
				assert(JSON.stringify(context).includes("SYNTHETIC_OBJECTIVE_4f927"), "startup/checkpoint must deliver the approved objective before work");
				if (budget && step === 2) {
					const projection = JSON.stringify(context.messages.at(-1));
					assert.match(projection, /TOKEN BUDGET REACHED/, "custom-start budget exhaustion retains wrap-up steering");
					assert.match(projection, /20 tokens over the budget/, "wrap-up reports the actual balance");
					assert.match(projection, /do not start new substantive work/);
				} else if (step > 0) {
					const projection = context.messages.at(-1);
					assert.match(JSON.stringify(projection), /\[PI GOAL ACTIVE goalId=/, "fresh focused projection must reach every request");
					assert(JSON.stringify(projection).includes("SYNTHETIC_OBJECTIVE_4f927"), "projection itself must carry the approved objective");
				}
			}
			assert(!context.systemPrompt.includes("[PI GOAL"), "dynamic goal state must not live in the system prompt");
			if (action === "rejected") assert.match(JSON.stringify(context.messages.at(-1)), /GOAL STALE|PI GOAL PAUSED/, "rejected checkpoints retain bounded stop guidance");
		} catch (error) { failure = error; }
		const call = (name, args) => [{ type: "toolCall", id: `call-${step}`, name, arguments: args }];
		const content = failure ? [{ type: "text", text: "Fixture failed." }]
			: action !== "startup" ? (++actionRequests === 1 ? call("write", { path: `${action}.txt`, content: action }) : [{ type: "text", text: "Attempt settled." }])
			: step === 0 ? call(guided ? "propose_goal_draft" : "create_goal", { objective, ...(guided ? { sisyphus: ordered } : {}), ...(budget ? { token_budget: 200 } : {}) })
			: step === 1 ? call("write", { path: "proof.txt", content: "SYNTHETIC_OBJECTIVE_4f927" })
			: step === 2 ? [{ type: "text", text: "File created; checkpoint should verify it." }]
			: step === 3 ? call("read", { path: "proof.txt" })
			: call("update_goal", { status: "paused", reason: "Synthetic startup verified.", suggested_action: "Inspect fixture evidence." });
		const message = { role: "assistant", api: model.api, provider: model.provider, model: model.id, content, usage: { input: 100, output: 10, cacheRead: 0, cacheWrite: 0, totalTokens: 110, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } }, stopReason: content[0].type === "toolCall" ? "toolUse" : "stop", timestamp: Date.now() };
		const stream = new AssistantMessageEventStream();
		stream.push({ type: "start", partial: message });
		stream.push({ type: "done", reason: message.stopReason, message });
		return stream;
	};
	deadline = setTimeout(() => { failure ??= new Error("startup fixture timed out"); void session.abort(); resolveFinished(); }, 5000);
	await session.prompt(explicit ? `Create a persistent goal: ${objective}` : `/${rejected ? "goal-direct" : mode} ${objective}`);
	await finished;
	if (failure) { console.error(JSON.stringify({ requests: captures.length, starts, results })); throw failure; }
	assert.equal(readFileSync(join(cwd, "proof.txt"), "utf8"), "SYNTHETIC_OBJECTIVE_4f927");
	assert.deepEqual(results.filter(r => r.isError), []);
	if (controlledClock) {
		const goal = results.findLast(result => result.details?.goal)?.details.goal;
		assert.equal(parseGoalFile(join(cwd, goal.activePath)).usage.activeSeconds, 8, "confirmed model creation charges its initial active interval");
	}
	assert(budget || results.some(r => r.toolName === "read" && JSON.stringify(r.content).includes("SYNTHETIC_OBJECTIVE_4f927")));
	const checkpoints = manager.getBranch().filter(e => e.type === "custom_message" && e.customType === "pi-goal-event");
	assert.equal(checkpoints.length, budget ? 1 : 2, "only eligible automatic checkpoints run");
	assert(checkpoints.every(e => e.content.length <= 160 && !e.content.includes("SYNTHETIC_OBJECTIVE")));
	assert.equal(starts, guided || explicit ? 1 : 0, "custom starts must use the real host path without before_agent_start");
	assert(!guided || confirmations > 0, "guided startup must cross the host's human confirmation interface");
	if (!budget) assert.equal(results.find(r => r.toolName === "update_goal").details.goal.sisyphus, ordered);
	if (budget) assert.deepEqual(results.map(r => r.toolName), ["create_goal", "write"], "one wrap-up without further work tools");
	assert(!manager.getBranch().some(e => e.customType === "pi-goal-context"), "per-response projections must not persist");
	if (rejected) {
		const original = checkpoints[0];
		action = "rejected";
		if (mode === "reject-unfocused") await session.prompt("/goal-unfocus");
		if (mode === "reject-replaced" || mode.startsWith("reject-malformed")) await session.prompt("/goal-direct Leave the replacement goal available for later work.");
		const currentFocus = manager.getBranch().findLast(e => e.type === "custom" && e.customType === "pi-goal-focus").data.focusedGoalId;
		const message = mode === "reject-malformed-large"
			? { customType: "pi-goal-event", content: "Malformed checkpoint ".repeat(1000), display: false }
			: mode === "reject-malformed-long-id"
				? { customType: "pi-goal-event", content: `<pi_goal_continuation goal_id="${"x".repeat(12000)}" kind="checkpoint" v="2"/>`, details: { goalId: "x".repeat(12000) }, display: false }
			: mode.startsWith("reject-malformed")
			? { customType: "pi-goal-event", content: mode === "reject-malformed-prefix" ? `<pi_goal_continuation goal_id="${currentFocus}"` : "malformed checkpoint", details: { goalId: currentFocus }, display: false }
			: mode === "reject-stale"
				? { customType: "pi-goal-event", content: '<pi_goal_continuation goal_id="missing-goal" kind="checkpoint" v="2"/>', details: { goalId: "missing-goal" }, display: false }
				: { customType: original.customType, content: original.content, details: original.details, display: false };
		await session.sendCustomMessage(message, { triggerTurn: true });
		assert.equal(existsSync(join(cwd, "rejected.txt")), false, "rejected checkpoint must not dispatch work");
		assert(session.messages.some(m => m.role === "toolResult" && m.toolName === "write" && m.isError && JSON.stringify(m.content).includes("checkpoint")), "host must expose the rejected work result");
		if (mode === "reject-replaced" || mode.startsWith("reject-malformed")) await session.prompt("/goal-pause");
		action = "explicit-user";
		actionRequests = 0;
		await session.prompt("Write explicit-user.txt containing explicit-user as ordinary user work.");
		assert.equal(readFileSync(join(cwd, "explicit-user.txt"), "utf8"), "explicit-user", "a later explicit user request retains normal work tools");
		if (failure) throw failure;
	}
	console.log(JSON.stringify({ passed: true, mode, requests: captures.length, starts, checkpoints: checkpoints.length, effects: results.map(r => r.toolName) }));
} finally {
	Date.now = originalNow;
	clearTimeout(deadline);
	await session?.abort();
	session?.dispose();
	rmSync(work, { recursive: true, force: true });
}
