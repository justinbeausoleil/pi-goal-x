/** S1/S2: real dispatch boundaries and ordinary user work after a goal stop. */
import assert from "node:assert/strict";
import {existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync} from "node:fs";
import http from "node:http";
import {tmpdir} from "node:os";
import {join, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {setTimeout as delay} from "node:timers/promises";
import {AssistantMessageEventStream} from "@earendil-works/pi-ai";
import {createAgentSession, createAgentSessionRuntime, DefaultResourceLoader, ModelRuntime, SessionManager, SettingsManager} from "@earendil-works/pi-coding-agent";

const [boundary = "response", control = "pause"] = process.argv.slice(2);
const switching = control.startsWith("switch");
const successor = control === "switch-active" || control === "pause-resume";
const reviewing = boundary === "audit" || boundary === "oracle";
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
const checkpoints = [];
let session, host, terminalInput, selectId, primary, secondary, responses = [], beforeResponse, duringDialog, failure, deadline;
let dialogSeen = false;
let triggerGoalId, testing = false, secondaryDone = false, replaying = false, forbiddenOffered = false;
let queuedUserSeen = false, queuedUserDone = false;
const pause = {name: "update_goal", args: {status: "paused", reason: "Fixture requested a deliberate stop.", suggested_action: "Wait for explicit user instructions."}};
const write = path => ({name: "write", args: {path, content: path}});
const currentGoal = () => results.findLast(result => result.details?.goal)?.details.goal;
let childRequests = 0, transportAborted = false;
let resolveChildClosed;
const childClosed = new Promise(resolve => { resolveChildClosed = resolve; });
const advice = {diagnosis: "Late Oracle advice", alternatives: [{title: "Inspect evidence", rationale: "Use actual files", steps: ["Read proof.txt"], expectedEvidence: ["proof"]}], recommendedIndex: 0, unresolvedQuestions: [], disposition: "actionable"};
const server = http.createServer(async (req, res) => {
  let body = "";
  for await (const chunk of req) body += chunk;
  const payload = JSON.parse(body);
  childRequests++;
  res.on("close", () => { if (!res.writableEnded) transportAborted = true; resolveChildClosed(); });
  if (childRequests === 1) { await stop(); await delay(30); }
  if (res.destroyed) return;
  res.writeHead(200, {"content-type": "text/event-stream"});
  const submit = boundary === "oracle" && !payload.messages.some(message => message.role === "tool");
  const delta = submit ? {role: "assistant", tool_calls: [{index: 0, id: "advice", type: "function", function: {name: "submit_goal_oracle_advice", arguments: JSON.stringify(advice)}}]} : {role: "assistant", content: boundary === "audit" ? "Late approval\n<approved/>" : "Advice recorded."};
  for (const [d, finish_reason] of [[delta, null], [{}, submit ? "tool_calls" : "stop"]]) res.write(`data: ${JSON.stringify({id: "stop-review", object: "chat.completion.chunk", created: 1, model: "reviewer", choices: [{index: 0, delta: d, finish_reason}]})}\n\n`);
  res.end("data: [DONE]\n\n");
});

async function stop() {
  if (control === "steering-only") return;
  if (control === "pause") await session.prompt("/goal-pause");
  else if (control === "pause-resume") { await session.prompt("/goal-pause"); await session.prompt("/goal-resume"); }
  else if (control === "esc") { const result = terminalInput("\x1b"); if (!result?.consume) void session.abort(); }
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
    custom: async () => {
      dialogSeen = true;
      if (boundary === "audit") return "continue_working";
      if (control === "esc") { assert.equal(terminalInput("\x1b"), undefined); return {decision: "cancel"}; }
      await duringDialog?.();
      return {decision: "confirm"};
    },
  }});
}
async function create({sessionManager, sessionStartEvent}) {
  const loader = new DefaultResourceLoader({cwd, agentDir, settingsManager: settings, noSkills: true, noPromptTemplates: true, noThemes: true, noContextFiles: true,
    systemPrompt: "Perform only the explicitly authorized fixture work.", additionalExtensionPaths: [fileURLToPath(new URL("../extensions/goal.ts", import.meta.url))],
    extensionFactories: [pi => {
      pi.on("tool_result", event => { results.push(event); });
      pi.on("message_start", event => {
        if (event.message.role === "user") {
          triggerGoalId = null;
          if (JSON.stringify(event.message.content).includes("queued-user-sentinel")) queuedUserSeen = true;
        }
        else if (event.message.role === "custom" && event.message.customType === "pi-goal-event") {
          triggerGoalId = event.message.details?.goalId;
          checkpoints.push(structuredClone(event.message));
        }
      });
    }],
  });
  await loader.reload({resolveProjectTrust: async () => true});
  assert.deepEqual(loader.getExtensions().errors, []);
  const runtime = await ModelRuntime.create({authPath: join(agentDir, "auth.json"), modelsPath: null, allowModelNetwork: false, refreshOnCreate: false});
  await runtime.setRuntimeApiKey("openai", "synthetic-unused");
  if (reviewing) runtime.registerProvider("fixture", {baseUrl: `http://127.0.0.1:${server.address().port}/v1`, api: "openai-completions", apiKey: "synthetic-unused", models: [{id: "reviewer", name: "Reviewer", reasoning: false, input: ["text"], contextWindow: 65536, maxTokens: 8192, cost: model.cost}]});
  const created = await createAgentSession({cwd, agentDir, modelRuntime: runtime, model, thinkingLevel: "off", resourceLoader: loader, sessionManager, settingsManager: settings, sessionStartEvent});
  session = created.session;
  session.subscribe(event => { if (["agent_start", "agent_end", "agent_settled", "turn_start", "turn_end", "message_end"].includes(event.type)) timeline.push({event: event.type, reason: event.message?.stopReason}); });
  session.agent.streamFunction = (requestedModel, context, options) => {
    requests.push(context);
    timeline.push({event: "request", count: requests.length});
    if (requests.length > 30) failure = new Error("Unbounded stop fixture continuation");
    const startSecondary = testing && !replaying && successor && triggerGoalId === (switching ? secondary.id : primary.id) && !secondaryDone;
    const staleFollowup = testing && boundary === "host-followup" && triggerGoalId === primary.id && !forbiddenOffered;
    if (staleFollowup) forbiddenOffered = true;
    const userWork = queuedUserSeen && !queuedUserDone;
    if (userWork) queuedUserDone = true;
    const calls = failure ? [] : userWork ? [write("queued-user.txt"), ...(control === "steering-only" ? [pause] : [])] : staleFollowup ? [write("forbidden.txt")] : startSecondary ? [write("secondary-proof.txt"), pause] : responses.shift() ?? [];
    if (startSecondary) secondaryDone = true;
    const content = calls.length ? calls.map((call, index) => ({type: "toolCall", id: `stop-${requests.length}-${index}`, name: call.name, arguments: call.args})) : [{type: "text", text: "Waiting for explicit authorization."}];
    const message = {role: "assistant", api: requestedModel.api, provider: requestedModel.provider, model: requestedModel.id, content,
      usage: {input: 100, output: 10, cacheRead: 0, cacheWrite: 0, totalTokens: 110, cost: {input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0}}, stopReason: calls.length ? "toolUse" : "stop", timestamp: Date.now()};
    const stream = new AssistantMessageEventStream();
    stream.push({type: "start", partial: message});
    const intervene = beforeResponse; beforeResponse = undefined;
    void (async () => {
      try { await intervene?.(); } catch (error) { failure = error; }
      if (boundary.startsWith("steering") && options.signal?.aborted) stream.push({type: "error", reason: "aborted", error: {...message, content: [], stopReason: "aborted"}});
      else stream.push({type: "done", reason: message.stopReason, message});
    })();
    return stream;
  };
  return {...created, services: {cwd, agentDir, modelRuntime: runtime, settingsManager: settings, resourceLoader: loader, diagnostics: []}, diagnostics: []};
}
async function settled() {
  for (let i = 0; i < 500; i++) {
    if (failure) throw failure;
    assert.deepEqual(errors, []);
    if (!responses.length && session.isIdle && (!testing || !successor || secondaryDone)) return;
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
  if (reviewing) {
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    mkdirSync(join(cwd, ".pi"));
    writeFileSync(join(cwd, ".pi", "pi-goal-x-settings.json"), JSON.stringify({provider: "fixture", model: "reviewer", disabled: false, oracle: {enabled: boundary === "oracle", provider: "fixture", model: "reviewer"}}));
  }
  host = await createAgentSessionRuntime(create, {cwd, agentDir, sessionManager: SessionManager.create(cwd, join(work, "sessions"))});
  host.setRebindSession(async current => { session = current; await bind(); });
  await bind();
  deadline = setTimeout(() => { failure = new Error("Stop fixture deadline exceeded"); void session.abort(); }, 8000);
  await run("Create a goal to verify explicit stop boundaries.", [
    {name: "create_goal", args: {objective: "Write only explicitly authorized fixture files; preserve user stop boundaries."}},
    {name: "set_goal_tasks", args: {tasks: [{id: "work", title: "Write the authorized fixture proof"}]}},
    ...(boundary === "audit" ? [write("proof.txt"), {name: "update_goal_task", args: {task_id: "work", status: "complete", evidence: "proof.txt contains proof.txt"}}] : []), pause,
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
  if (boundary !== "ordinary") await session.prompt("/goal-resume");
  if (boundary === "ordinary") {
    responses = [[{name: "bash", args: {command: "printf started > ordinary-started.txt; sleep 0.2; printf complete > ordinary-finished.txt"}}], [write("ordinary-later.txt")]];
    const pending = session.prompt("Run this unrelated ordinary request while the goal stays paused.");
    for (let i = 0; i < 300 && !existsSync(join(cwd, "ordinary-started.txt")); i++) await delay(10);
    assert(existsSync(join(cwd, "ordinary-started.txt")));
    assert.equal(existsSync(join(cwd, "ordinary-later.txt")), false, "the later dispatch must follow the control");
    await stop();
    await pending;
    await settled();
    assert.equal(readFileSync(join(cwd, "ordinary-finished.txt"), "utf8"), "complete", "a paused goal does not own this running ordinary tool");
    assert(existsSync(join(cwd, "ordinary-later.txt")), "goal controls preserve subsequent ordinary dispatches");
  } else if (boundary === "dialog") {
    process.env.PI_GOAL_AUTO_CONFIRM = "";
    duringDialog = stop;
    const revision = results.findLast(result => result.details?.goal?.id === primary.id)?.details.work_revision;
    assert(revision);
    await run("Review this task addition and honor any control while the dialog is open.", [{name: "set_goal_tasks", args: {mode: "upsert", expected_work_revision: revision, tasks: [{id: "late", title: "Must not apply after a stop"}]}}, ...(control === "esc" ? [pause] : [])]);
    assert(dialogSeen, "the task confirmation really opened");
    const result = results.findLast(result => result.toolName === "set_goal_tasks");
    assert.match(JSON.stringify(result.content), /cancel|no longer|stopped|changed/i, "the old dialog cannot commit");
    if (control === "esc") assert.equal(result.details.goal.status, "active", "dialog Escape cancels the dialog without pausing the goal");
    const file = control === "clear" ? join(cwd, ".pi/goals/archived", readdirSync(join(cwd, ".pi/goals/archived")).find(name => name.endsWith(".md"))) : resolve(cwd, primary.activePath);
    assert(!readFileSync(file, "utf8").includes("Must not apply after a stop"));
  } else if (reviewing) {
    const resultIndex = results.length;
    await run("Consult the independent review and honor a concurrent user control.", [{name: "update_goal", args: {status: boundary === "audit" ? "complete" : "blocked", reason: "The same actual blocker persisted over three attempts."}}, ...(boundary === "audit" && control === "esc" ? [pause] : [])]);
    if (boundary === "audit" && control === "esc") assert.equal(results[resultIndex].details.goal.status, "active", "Escape aborts the audit and the continue choice preserves the open goal");
    assert(childRequests > 0, "the actual child transport reached the async boundary");
    const ledger = readFileSync(join(cwd, ".pi/goals/goal_events.jsonl"), "utf8");
    assert.doesNotMatch(ledger, /"type":"(?:audit_result|goal_completed|oracle_result)"/, "late child results cannot mutate or arm the stopped goal");
    await childClosed;
    assert(transportAborted, "supported child transport is aborted after a user stop");
  } else if (boundary.startsWith("steering")) {
    beforeResponse = async () => {
      assert.equal(triggerGoalId, primary.id, "steering races an actual autonomous checkpoint");
      await session.sendUserMessage("queued-user-sentinel: write queued-user.txt as my next ordinary request.", {deliverAs: boundary === "steering-followup" ? "followUp" : "steer"});
      await stop();
    };
    responses = [[write("forbidden.txt")]];
    await settled();
    if (!existsSync(join(cwd, "queued-user.txt"))) console.error(JSON.stringify({queuedUserSeen, queuedUserDone, timeline, notices, results: results.slice(-5), pending: session.pendingMessageCount}));
    assert(existsSync(join(cwd, "queued-user.txt")), "the user's queued request survives the goal stop");
  } else if (boundary === "host-followup") {
    const old = checkpoints.find(message => message.details.goalId === primary.id);
    assert(old);
    await stop();
    beforeResponse = () => session.sendCustomMessage(old, {triggerTurn: true, deliverAs: "followUp"});
    await run("Write the explicit ordinary request and honor the stopped goal.", [write("host-user.txt")]);
    assert(existsSync(join(cwd, "host-user.txt")));
    assert(forbiddenOffered, "the host actually consumed its queued old checkpoint");
  } else if (boundary === "next-turn") {
    const old = checkpoints.find(message => message.details.goalId === primary.id);
    assert(old);
    await stop();
    await session.sendCustomMessage(old, {deliverAs: "nextTurn"});
    await run("Write this fresh user request; the attached historical checkpoint grants no work authority.", [write("next-turn-user.txt")]);
    assert(existsSync(join(cwd, "next-turn-user.txt")), "a historical next-turn attachment cannot override fresh user intent");
  } else if (boundary === "replay") {
    const old = checkpoints.find(message => message.details.goalId === primary.id);
    assert(old, "public startup issued the checkpoint being replayed");
    await stop();
    responses = [[write("forbidden.txt")]];
    replaying = true;
    await session.sendCustomMessage(old, {triggerTurn: true});
    replaying = false;
    assert.equal(existsSync(join(cwd, "forbidden.txt")), false, "a host-held old checkpoint cannot regain authority after resume");
    await settled();
  } else if (boundary === "queued") {
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
  if (successor) {
    if (!existsSync(join(cwd, "secondary-proof.txt"))) console.error(JSON.stringify({notices, timeline, results: results.slice(-5).map(r => ({tool: r.toolName, content: r.content})), requests: requests.map(r => r.messages.slice(-1))}));
    assert(existsSync(join(cwd, "secondary-proof.txt")), "the old abort cannot pause the user's newly authorized successor");
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
  if (reviewing) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  rmSync(work, {recursive: true, force: true});
}
