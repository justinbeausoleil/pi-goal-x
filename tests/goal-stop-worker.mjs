/** S1/S2: real dispatch boundaries and ordinary user work after a goal stop. */
import assert from "node:assert/strict";
import {existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {setTimeout as delay} from "node:timers/promises";
import {AssistantMessageEventStream} from "@earendil-works/pi-ai";
import {createAgentSession, createAgentSessionRuntime, DefaultResourceLoader, ModelRuntime, SessionManager, SettingsManager} from "@earendil-works/pi-coding-agent";

const [boundary = "response", control = "pause"] = process.argv.slice(2);
const switching = control.startsWith("switch");
const work = mkdtempSync(join(tmpdir(), "goal-stop-native-"));
const cwd = join(work, "project"), agentDir = join(work, "agent");
mkdirSync(cwd); mkdirSync(agentDir);
process.env.PI_OFFLINE = "1";
process.env.PI_CODING_AGENT_DIR = agentDir;
process.env.PI_GOAL_GLOBAL_SETTINGS_FILE = join(agentDir, "goal-settings.json");
process.env.PI_GOAL_AUTO_CONFIRM = "1";
const settings = SettingsManager.inMemory({compaction: {enabled: false}, retry: {enabled: false}});
const model = {id: "synthetic", name: "Synthetic", provider: "openai", api: "openai-completions", baseUrl: "http://127.0.0.1:1", reasoning: false, input: ["text"], contextWindow: 65536, maxTokens: 8192, cost: {input: 0, output: 0, cacheRead: 0, cacheWrite: 0}};
const results = [], errors = [], requests = [], notices = [];
const timeline = [];
let session, host, terminalInput, selectId, primary, secondary, responses = [], beforeResponse, failure, deadline;
let triggerGoalId, testing = false, secondaryDone = false;
const pause = {name: "update_goal", args: {status: "paused", reason: "Fixture requested a deliberate stop.", suggested_action: "Wait for explicit user instructions."}};
const write = path => ({name: "write", args: {path, content: path}});
const currentGoal = () => results.findLast(result => result.details?.goal)?.details.goal;

async function stop() {
  if (control === "pause") await session.prompt("/goal-pause");
  else if (control === "esc") { terminalInput("\x1b"); void session.abort(); }
  else if (control === "abort") void session.abort();
  else if (control === "unfocus") await session.prompt("/goal-unfocus");
  else if (switching) { selectId = secondary.id; await session.prompt("/goal-focus"); }
  else if (control === "clear") await session.prompt("/goal-clear");
  else throw new Error(`Unsupported user stop: ${control}`);
}
async function bind() {
  await session.bindExtensions({mode: "rpc", onError: error => errors.push(error), uiContext: {
    notify: message => notices.push(message), setStatus() {}, setWidget() {}, setEditorText() {},
    onTerminalInput: handler => { terminalInput = handler; return () => {}; },
    confirm: async title => title === "Clear goal?",
    select: async (_title, choices) => choices.find(choice => choice.includes(selectId)),
  }});
}
async function create({sessionManager, sessionStartEvent}) {
  const loader = new DefaultResourceLoader({cwd, agentDir, settingsManager: settings, noSkills: true, noPromptTemplates: true, noThemes: true, noContextFiles: true,
    systemPrompt: "Perform only the explicitly authorized fixture work.", additionalExtensionPaths: [fileURLToPath(new URL("../extensions/goal.ts", import.meta.url))],
    extensionFactories: [pi => {
      pi.on("tool_result", event => { results.push(event); });
      pi.on("message_start", event => {
        if (event.message.role === "user") triggerGoalId = null;
        else if (event.message.role === "custom" && event.message.customType === "pi-goal-event") triggerGoalId = event.message.details?.goalId;
      });
    }],
  });
  await loader.reload({resolveProjectTrust: async () => true});
  assert.deepEqual(loader.getExtensions().errors, []);
  const runtime = await ModelRuntime.create({authPath: join(agentDir, "auth.json"), modelsPath: null, allowModelNetwork: false, refreshOnCreate: false});
  await runtime.setRuntimeApiKey("openai", "synthetic-unused");
  const created = await createAgentSession({cwd, agentDir, modelRuntime: runtime, model, thinkingLevel: "off", resourceLoader: loader, sessionManager, settingsManager: settings, sessionStartEvent});
  session = created.session;
  session.subscribe(event => { if (["agent_start", "agent_end", "agent_settled", "turn_start", "turn_end", "message_end"].includes(event.type)) timeline.push({event: event.type, reason: event.message?.stopReason}); });
  session.agent.streamFunction = (requestedModel, context) => {
    requests.push(context);
    timeline.push({event: "request", count: requests.length});
    if (requests.length > 30) failure = new Error("Unbounded stop fixture continuation");
    const startSecondary = testing && control === "switch-active" && triggerGoalId === secondary.id && !secondaryDone;
    const calls = failure ? [] : startSecondary ? [write("secondary-proof.txt"), pause] : responses.shift() ?? [];
    if (startSecondary) secondaryDone = true;
    const content = calls.length ? calls.map((call, index) => ({type: "toolCall", id: `stop-${requests.length}-${index}`, name: call.name, arguments: call.args})) : [{type: "text", text: "Waiting for explicit authorization."}];
    const message = {role: "assistant", api: requestedModel.api, provider: requestedModel.provider, model: requestedModel.id, content,
      usage: {input: 100, output: 10, cacheRead: 0, cacheWrite: 0, totalTokens: 110, cost: {input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0}}, stopReason: calls.length ? "toolUse" : "stop", timestamp: Date.now()};
    const stream = new AssistantMessageEventStream();
    stream.push({type: "start", partial: message});
    const intervene = beforeResponse; beforeResponse = undefined;
    void (async () => {
      try { await intervene?.(); } catch (error) { failure = error; }
      stream.push({type: "done", reason: message.stopReason, message});
    })();
    return stream;
  };
  return {...created, services: {cwd, agentDir, modelRuntime: runtime, settingsManager: settings, resourceLoader: loader, diagnostics: []}, diagnostics: []};
}
async function settled() {
  for (let i = 0; i < 500; i++) {
    if (failure) throw failure;
    assert.deepEqual(errors, []);
    if (!responses.length && session.isIdle && (!testing || control !== "switch-active" || secondaryDone)) return;
    await delay(10);
  }
  throw new Error("Native stop fixture did not settle");
}
async function run(prompt, calls) {
  responses = calls.map(call => [call]);
  await session.prompt(prompt);
  await settled();
}
try {
  host = await createAgentSessionRuntime(create, {cwd, agentDir, sessionManager: SessionManager.create(cwd, join(work, "sessions"))});
  host.setRebindSession(async current => { session = current; await bind(); });
  await bind();
  deadline = setTimeout(() => { failure = new Error("Stop fixture deadline exceeded"); void session.abort(); }, 8000);
  await run("Create a goal to verify explicit stop boundaries.", [
    {name: "create_goal", args: {objective: "Write only explicitly authorized fixture files; preserve user stop boundaries."}},
    {name: "set_goal_tasks", args: {tasks: [{id: "work", title: "Write the authorized fixture proof"}]}}, pause,
  ]);
  primary = structuredClone(currentGoal());
  assert.equal(primary.status, "paused");
  if (switching) {
    responses = [[pause]];
    await session.prompt("/goal-direct Keep this secondary goal paused until selected.");
    await delay(50); await settled();
    secondary = structuredClone(currentGoal());
    assert.notEqual(secondary.id, primary.id);
    if (control === "switch-active") await session.prompt("/goal-resume");
    selectId = primary.id;
    await session.prompt("/goal-focus");
  }
  const before = requests.length;
  testing = true;
  await session.prompt("/goal-resume");
  if (boundary === "queued") {
    responses = [[write("forbidden.txt")]];
    await stop();
    await delay(100);
    assert.equal(requests.length, before, "stopping a scheduled checkpoint issues no new request");
  } else if (boundary === "response") {
    beforeResponse = stop;
    responses = [[write("forbidden.txt")]];
    await session.prompt("Do the authorized work for the focused goal.");
    await settled();
  } else if (boundary === "dispatched") {
    responses = [[{name: "bash", args: {command: "printf dispatched > dispatched.txt; sleep 1; printf forbidden > forbidden.txt"}}]];
    const pending = session.prompt("Run the authorized tool and honor any user stop.");
    for (let i = 0; i < 300 && !existsSync(join(cwd, "dispatched.txt")); i++) await delay(10);
    assert.equal(readFileSync(join(cwd, "dispatched.txt"), "utf8"), "dispatched", "the tool's first effect preceded the stop");
    await stop();
    await pending;
    await settled();
  } else if (boundary === "agent") {
    responses = [[write("dispatched.txt"), pause, write("forbidden.txt")]];
    await session.prompt("Pause immediately with a reason and suggested next action.");
    await settled();
  } else throw new Error(`Unknown boundary ${boundary}`);
  assert.equal(existsSync(join(cwd, "forbidden.txt")), false, "a new goal work effect cannot be dispatched after the stop");
  if (boundary === "dispatched" || boundary === "agent") assert(existsSync(join(cwd, "dispatched.txt")), "effects already dispatched are not rolled back");
  if (control === "switch-active") {
    if (!existsSync(join(cwd, "secondary-proof.txt"))) console.error(JSON.stringify({notices, timeline, results: results.slice(-5).map(r => ({tool: r.toolName, content: r.content})), requests: requests.map(r => r.messages.slice(-1))}));
    assert(existsSync(join(cwd, "secondary-proof.txt")), "aborting goal A cannot pause the newly selected active goal B");
  }
  assert.deepEqual(errors, []);
  responses = [];
  await run("Write ordinary-user.txt as a new, explicit ordinary user request.", [write("ordinary-user.txt")]);
  assert.equal(readFileSync(join(cwd, "ordinary-user.txt"), "utf8"), "ordinary-user.txt", "fresh user work remains available after a goal stop");
  await run("Inspect the focused goal without resuming work.", [{name: "get_goal", args: {}}]);
  const focused = results.at(-1).details.goal;
  if (["unfocus", "clear"].includes(control) && boundary !== "agent") assert.equal(focused, null);
  else if (switching && boundary !== "agent") assert.equal(focused.id, secondary.id);
  else assert.equal(focused.status, "paused");
  if (boundary === "agent") {
    assert.equal(focused.pauseReason, pause.args.reason);
    assert.equal(focused.pauseSuggestedAction, pause.args.suggested_action);
  }
  console.log(JSON.stringify({passed: true, boundary, control, requests: requests.length, toolResults: results.map(result => ({name: result.toolName, isError: result.isError}))}));
} finally {
  clearTimeout(deadline);
  await session?.abort();
  await host?.dispose();
  rmSync(work, {recursive: true, force: true});
}
