/** S1/S2 project progress and execution authority through native session boundaries. */
import assert from "node:assert/strict";
import {existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {setTimeout as delay} from "node:timers/promises";
import {AssistantMessageEventStream} from "@earendil-works/pi-ai";
import {createAgentSession, createAgentSessionRuntime, DefaultResourceLoader, ModelRuntime, SessionManager, SettingsManager} from "@earendil-works/pi-coding-agent";

const scenario = process.argv[2] ?? "tree";
const work = mkdtempSync(join(tmpdir(), "goal-ownership-native-"));
const cwd = join(work, "project"), agentDir = join(work, "agent");
mkdirSync(cwd); mkdirSync(agentDir);
process.env.PI_OFFLINE = "1";
process.env.PI_CODING_AGENT_DIR = agentDir;
process.env.PI_GOAL_GLOBAL_SETTINGS_FILE = join(agentDir, "goal-settings.json");
process.env.PI_GOAL_AUTO_CONFIRM = "1";
const settings = SettingsManager.inMemory({compaction: {enabled: false, reserveTokens: 16384, keepRecentTokens: 100}, retry: {enabled: false}});
const model = {id: "synthetic", name: "Synthetic", provider: "openai", api: "openai-completions", baseUrl: "http://127.0.0.1:1", reasoning: false, input: ["text"], contextWindow: 65536, maxTokens: 8192, cost: {input: 0, output: 0, cacheRead: 0, cacheWrite: 0}};
const results = [], errors = [], requests = [], notices = [];
let session, host, steps = [], earlyLeaf, failure, shutdownFile, summaries = 0;
const goalResult = () => results.findLast(r => r.details?.goal)?.details.goal;
const checkpoints = () => session.sessionManager.getBranch().filter(e => e.customType === "pi-goal-event").length;
const readGoal = () => readFileSync(join(cwd, goalResult().activePath), "utf8");
const pause = {name: "update_goal", args: {status: "paused", reason: "Ownership checkpoint observed."}};

async function open(manager, sessionStartEvent) {
  const loader = new DefaultResourceLoader({cwd, agentDir, settingsManager: settings, noSkills: true, noPromptTemplates: true, noThemes: true, noContextFiles: true,
    systemPrompt: "Perform only the explicitly authorized fixture work.", additionalExtensionPaths: [fileURLToPath(new URL("../extensions/goal.ts", import.meta.url))],
    extensionFactories: [pi => {
      pi.on("tool_result", event => {
        results.push(event);
        if (event.toolName === "set_goal_tasks") earlyLeaf = session.sessionManager.getLeafId();
      });
      pi.on("session_shutdown", () => { if (goalResult()) shutdownFile = readGoal(); });
    }],
  });
  await loader.reload({resolveProjectTrust: async () => true});
  assert.deepEqual(loader.getExtensions().errors, []);
  const runtime = await ModelRuntime.create({authPath: join(agentDir, "auth.json"), modelsPath: null, allowModelNetwork: false, refreshOnCreate: false});
  await runtime.setRuntimeApiKey("openai", "synthetic-unused");
  const created = await createAgentSession({cwd, agentDir, modelRuntime: runtime, model, thinkingLevel: "off", resourceLoader: loader, sessionManager: manager, settingsManager: settings, sessionStartEvent});
  session = created.session;
  session.agent.streamFunction = (requestedModel, context) => {
    const summary = !context.tools?.length;
    if (summary) summaries++;
    else requests.push({session: session.sessionId, context});
    if (requests.length > 40) failure = new Error("Unbounded ownership continuation");
    const step = failure || summary ? undefined : steps.shift();
    const args = step ? {...step.args} : undefined;
    if (args?.expected_work_revision === "$current") args.expected_work_revision = results.findLast(r => r.details?.work_revision)?.details.work_revision;
    const value = {role: "assistant", api: requestedModel.api, provider: requestedModel.provider, model: requestedModel.id,
      content: step ? [{type: "toolCall", id: `ownership-${requests.length}`, name: step.name, arguments: args}] : [{type: "text", text: "Waiting for explicit authorization."}],
      usage: {input: 100, output: 10, cacheRead: 0, cacheWrite: 0, totalTokens: 110, cost: {input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0}}, stopReason: step ? "toolUse" : "stop", timestamp: Date.now()};
    const stream = new AssistantMessageEventStream(); stream.push({type: "start", partial: value}); stream.push({type: "done", reason: value.stopReason, message: value}); return stream;
  };
  await session.bindExtensions({mode: "rpc", onError: error => errors.push(error), uiContext: {
    notify: message => notices.push(message), setStatus() {}, setWidget() {}, setEditorText() {}, onTerminalInput: () => () => {},
    confirm: async () => false, select: async () => undefined, input: async () => undefined,
  }});
  return {...created, services: {cwd, agentDir, modelRuntime: runtime, settingsManager: settings, resourceLoader: loader, diagnostics: []}, diagnostics: []};
}
async function settled() {
  for (let i = 0; i < 400; i++) {
    if (failure) throw failure;
    assert.deepEqual(errors, []);
    if (!steps.length && session.isIdle) return;
    await delay(10);
  }
  throw new Error(`Native ownership fixture did not settle; pending=${steps.map(s => s.name)}`);
}
async function run(prompt, calls) {
  steps = [...calls];
  await session.prompt(prompt);
  await settled();
}
try {
  host = await createAgentSessionRuntime(({sessionManager, sessionStartEvent}) => open(sessionManager, sessionStartEvent), {cwd, agentDir, sessionManager: SessionManager.create(cwd, join(work, "sessions"))});
  await run("Create a goal to preserve verified fixture progress through session navigation.", [
    {name: "create_goal", args: {objective: "Preserve the verified task and its artifact through session navigation."}},
    {name: "set_goal_tasks", args: {tasks: [{id: "verified", title: "Write verified.txt", verification_contract: "verified.txt contains preserved-proof"}, {id: "remaining", title: "Remaining work"}]}},
    {name: "write", args: {path: "verified.txt", content: "preserved-proof"}},
    {name: "update_goal_task", args: {expected_work_revision: "$current", task_id: "verified", status: "complete", evidence: "verified.txt contains preserved-proof"}},
    pause,
  ]);
  const approved = structuredClone(goalResult());
  assert.equal(approved.status, "paused");
  assert.equal(readFileSync(join(cwd, "verified.txt"), "utf8"), "preserved-proof");
  assert(earlyLeaf);
  if (scenario === "tree" || scenario === "fork") {
    await session.prompt("/goal-resume");
    const before = requests.length;
    if (scenario === "tree") await session.navigateTree(earlyLeaf);
    else assert.equal((await host.fork(earlyLeaf, {position: "at"})).cancelled, false);
    const boundaryCheckpoints = checkpoints();
    steps = [{name: "write", args: {path: "unsolicited.txt", content: "Must not execute from inherited authority"}}];
    await delay(150);
    assert.equal(existsSync(join(cwd, "unsolicited.txt")), false, "navigation/fork cannot authorize new goal work");
    assert.equal(requests.length, before, "boundary starts zero unsolicited provider requests");
    assert.equal(checkpoints(), boundaryCheckpoints);
    if (scenario === "fork") {
      const focus = session.sessionManager.getBranch().findLast(e => e.customType === "pi-goal-focus");
      assert.equal(focus.data.focusedGoalId, null, "fork explicitly detaches before scheduling");
      assert.equal(readGoal(), shutdownFile, "fork preserves the settled project file");
    }
    await run("Inspect current project progress only.", [{name: "get_goal", args: {}}]);
    if (scenario === "tree") {
      assert.equal(goalResult().taskList.tasks[0].status, "complete", "project progress wins over earlier chat");
      const content = requests.at(-1).context.messages.at(-1).content;
      const projection = typeof content === "string" ? content : content.map(c => c.text ?? "").join("\n");
      assert(projection.length <= 10000);
      assert.match(projection, /automatic goal work remains held/);
      assert.doesNotMatch(projection, /Use work tools directly/);
      await session.compact();
      await delay(150);
      assert.equal(checkpoints(), boundaryCheckpoints, "compaction cannot release navigation's hold");
    }
    else assert.equal(results.at(-1).details.goal, null);
    await run(scenario === "tree" ? "/goal-resume" : "/goal-focus", [pause]);
    assert.equal(checkpoints() - boundaryCheckpoints, 1, "explicit user action authorizes one checkpoint");
    assert.equal(goalResult().taskList.tasks[0].evidence, approved.taskList.tasks[0].evidence);
  } else throw new Error(`Unknown ownership scenario ${scenario}`);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, scenario, requests: requests.length, summaries, checkpoints: checkpoints(), effects: results.filter(r => r.toolName === "write").length}));
} finally {
  if (session) await session.abort();
  if (host) await host.dispose();
  rmSync(work, {recursive: true, force: true});
}
