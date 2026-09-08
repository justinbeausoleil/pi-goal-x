/** S1/S2: real dispatch boundaries and ordinary user work after a goal stop. */
import assert from "node:assert/strict";
import fs from "node:fs";
import {syncBuiltinESMExports} from "node:module";
import {existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync} from "node:fs";
import http from "node:http";
import {tmpdir} from "node:os";
import {join, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {setTimeout as delay} from "node:timers/promises";
import {AssistantMessageEventStream} from "@earendil-works/pi-ai";
import {createAgentSession, createAgentSessionRuntime, DefaultResourceLoader, ModelRuntime, SessionManager, SettingsManager} from "@earendil-works/pi-coding-agent";
import {parseGoalFile} from "../extensions/storage/goal-files.ts";
import {goalLedgerPath} from "../extensions/goal-ledger.ts";

const [boundary = "response", control = "pause"] = process.argv.slice(2);
const clearUnpaid = process.argv.includes("--clear-unpaid");
const lateBudget = process.argv.includes("--late-budget");
const exhaustedEdit = process.argv.includes("--exhausted-edit");
const controlledClock = process.argv.includes("--clock");
const originalNow = Date.now;
let clockNow = originalNow();
if (controlledClock) Date.now = () => clockNow;
const switching = control.startsWith("switch");
const replacing = control.startsWith("replace");
const successor = boundary !== "oracle-followup" && (replacing || ["switch-active", "pause-resume", "reload", "reopen", "agent-resume"].includes(control));
const oracleFollowup = boundary === "oracle-followup";
const oracleOutcome = boundary === "oracle-outcome";
const reviewing = boundary === "audit" || boundary === "oracle" || oracleFollowup || oracleOutcome;
const agentStop = boundary === "agent" || boundary === "agent-block";
let retryOffered = false, hostRetries = 0;
const work = mkdtempSync(join(tmpdir(), "goal-stop-native-"));
const cwd = join(work, "project"), agentDir = join(work, "agent");
mkdirSync(cwd); mkdirSync(agentDir);
process.env.PI_OFFLINE = "1";
process.env.PI_CODING_AGENT_DIR = agentDir;
process.env.PI_GOAL_GLOBAL_SETTINGS_FILE = join(agentDir, "goal-settings.json");
process.env.PI_GOAL_AUTO_CONFIRM = "1";
const settings = SettingsManager.inMemory({compaction: {enabled: false}, retry: {enabled: boundary === "provider-retry", maxRetries: 2, baseDelayMs: 1}});
const model = {id: "synthetic", name: "Synthetic", provider: "openai", api: "openai-completions", baseUrl: "http://127.0.0.1:1", reasoning: false, input: ["text"], contextWindow: 65536, maxTokens: 8192, cost: {input: 0, output: 0, cacheRead: 0, cacheWrite: 0}};
const results = [], errors = [], requests = [], notices = [];
const bills = [];
let billedRunOwner;
const timeline = [];
const serialOrder = [];
let pauseDispatches = 0;
async function pendingBarrier() {
  serialOrder.push("pending-entered");
  await delay(50);
  assert.equal(pauseDispatches, 0, "agent pause cannot dispatch during the earlier sequential tool");
  assert.equal(existsSync(join(cwd, "forbidden.txt")), false);
  serialOrder.push("pending-released");
}
const checkpoints = [];
let session, host, terminalInput, selectId, primary, secondary, responses = [], beforeResponse, duringDialog, failure, deadline;
let dialogSeen = false;
let triggerGoalId, testing = false, secondaryDone = false, replaying = false, forbiddenOffered = false;
let queuedUserSeen = false, queuedUserDone = false;
let agentResumed = false, agentResumeCheckpoint = 0;
let faultGoalId, failedUsageWrites = 0;
const originalRename = fs.renameSync;
fs.renameSync = (from, to) => {
  if (faultGoalId && String(to).endsWith(".md") && String(to).includes(faultGoalId) && !(clearUnpaid && String(to).includes("/archived/"))) {
    failedUsageWrites++;
    throw Object.assign(new Error("Synthetic unpaid-usage write failure"), {code: "EACCES"});
  }
  return originalRename(from, to);
};
syncBuiltinESMExports();
const pause = {name: "update_goal", args: {status: "paused", reason: "Fixture requested a deliberate stop.", suggested_action: "Wait for explicit user instructions."}};
const write = path => ({name: "write", args: {path, content: path}});
const currentGoal = () => results.findLast(result => result.details?.goal)?.details.goal;
let childRequests = 0, summaries = 0, transportAborted = false;
const childPayloads = [];
let resolveChildClosed;
const childClosed = new Promise(resolve => { resolveChildClosed = resolve; });
const advice = {diagnosis: "Late Oracle advice", alternatives: [{title: "Inspect evidence", rationale: "Use actual files", steps: ["Read proof.txt"], expectedEvidence: ["proof"]}], recommendedIndex: 0, unresolvedQuestions: [], disposition: "actionable"};
const server = http.createServer(async (req, res) => {
  let body = "";
  for await (const chunk of req) body += chunk;
  const payload = JSON.parse(body);
  childPayloads.push(payload);
  childRequests++;
  res.on("close", () => { if (!res.writableEnded) transportAborted = true; resolveChildClosed(); });
  if (childRequests === 1 && !oracleFollowup && !oracleOutcome) { await stop(); await delay(30); }
  if (res.destroyed) return;
  if (oracleOutcome && control === "provider") { res.writeHead(401); res.end(JSON.stringify({error: {message: "Synthetic Oracle provider failure"}})); return; }
  res.writeHead(200, {"content-type": "text/event-stream"});
  const submit = boundary.startsWith("oracle") && control !== "malformed" && !payload.messages.some(message => message.role === "tool");
  const offered = {...advice, ...(["needs_human", "insufficient_context"].includes(control) ? {disposition: control} : {}), ...(control === "invalid-index" ? {recommendedIndex: 3} : {})};
  const delta = submit ? {role: "assistant", tool_calls: [{index: 0, id: "advice", type: "function", function: {name: "submit_goal_oracle_advice", arguments: JSON.stringify(offered)}}]} : {role: "assistant", content: boundary === "audit" ? (control === "serial" ? "More work is required.\n<disapproved/>" : "Late approval\n<approved/>") : "Advice recorded."};
  for (const [d, finish_reason] of [[delta, null], [{}, submit ? "tool_calls" : "stop"]]) res.write(`data: ${JSON.stringify({id: "stop-review", object: "chat.completion.chunk", created: 1, model: "reviewer", choices: [{index: 0, delta: d, finish_reason}]})}\n\n`);
  res.end("data: [DONE]\n\n");
});

async function stop() {
  if (controlledClock) clockNow += 2300;
  if (control === "serial") { await pendingBarrier(); return; }
  if (control === "steering-only") return;
  if (control === "pause") await session.prompt("/goal-pause");
  else if (control === "pause-resume") { await session.prompt("/goal-pause"); await session.prompt("/goal-resume"); }
  else if (control === "esc") { const result = terminalInput("\x1b"); if (!result?.consume) void session.abort(); }
  else if (control === "abort") void session.abort();
  else if (control === "unfocus") await session.prompt("/goal-unfocus");
  else if (control === "reload") await session.reload();
  else if (control === "reopen") await host.switchSession(session.sessionManager.getSessionFile());
  else if (replacing) await session.prompt(control === "replace-ordered"
    ? "/sisyphus-direct 1) Write secondary-proof.txt. Done when the file exists. 2) Inspect the proof. Done when its contents match secondary-proof.txt."
    : "/goal-direct Write only the newly authorized successor proof.");
  else if (switching) { selectId = secondary.id; await session.prompt("/goal-focus"); }
  else if (control === "clear") await session.prompt("/goal-clear");
  else throw new Error(`Unsupported user stop: ${control}`);
  if (process.argv.includes("--usage-fault")) faultGoalId = primary.id;
  if (controlledClock) clockNow += 5700;
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
      return {decision: control === "serial" ? "cancel" : "confirm"};
    },
  }});
}
async function create({sessionManager, sessionStartEvent}) {
  const loader = new DefaultResourceLoader({cwd, agentDir, settingsManager: settings, noSkills: true, noPromptTemplates: true, noThemes: true, noContextFiles: true,
    systemPrompt: "Perform only the explicitly authorized fixture work.", additionalExtensionPaths: [fileURLToPath(new URL("../extensions/goal.ts", import.meta.url))],
    extensionFactories: [pi => {
      pi.on("agent_start", () => { billedRunOwner = undefined; });
      pi.on("tool_result", event => {
        results.push(event);
        if (controlledClock && event.toolName === "create_goal" && event.details?.goal) clockNow += 8000;
        if (controlledClock && testing && agentStop && event.toolName === "update_goal" && ["paused", "blocked"].includes(event.details?.goal?.status)) clockNow += 5700;
        if (event.toolName === "create_goal" && event.details?.goal && bills.at(-1)?.goalId === null) {
          billedRunOwner = event.details.goal.id;
          bills.at(-1).goalId = billedRunOwner;
        }
      });
      pi.on("turn_end", async () => {
        if (testing && control === "agent-resume" && !agentResumed && currentGoal()?.status === "paused") {
          agentResumed = true;
          agentResumeCheckpoint = checkpoints.length;
          await session.prompt("/goal-resume");
        }
      });
      pi.on("message_start", event => {
        if (event.message.role === "user") {
          billedRunOwner = undefined;
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
  const created = await createAgentSession({cwd, agentDir, modelRuntime: runtime, model, thinkingLevel: "off", resourceLoader: loader, sessionManager, settingsManager: settings, sessionStartEvent,
    ...(boundary === "idle" || oracleFollowup ? {tools: ["read", "bash", "edit", "write", "grep", "find", "ls", "create_goal", "get_goal", "update_goal", "set_goal_tasks", "update_goal_task"]} : {}),
  });
  session = created.session;
  session.subscribe(event => {
    if (event.type === "auto_retry_start") hostRetries++;
    if (testing && event.type === "tool_execution_start" && event.toolName === "update_goal" && event.args?.status === "paused") { pauseDispatches++; serialOrder.push("agent-pause-dispatch"); }
    if (["agent_start", "agent_end", "agent_settled", "turn_start", "turn_end", "message_end"].includes(event.type)) timeline.push({event: event.type, reason: event.message?.stopReason});
  });
  session.agent.streamFunction = (requestedModel, context, options) => {
    if (!context.tools?.length) {
      summaries++;
      assert(!JSON.stringify(context).includes("[PI GOAL ACTIVE"), "summarization has no executor projection");
      const message = {role: "assistant", api: requestedModel.api, provider: requestedModel.provider, model: requestedModel.id,
        content: [{type: "text", text: "Earlier fixture discussion occurred. Goal and Oracle details were omitted."}],
        usage: {input: 100, output: 10, cacheRead: 0, cacheWrite: 0, totalTokens: 110, cost: model.cost}, stopReason: "stop", timestamp: Date.now()};
      const stream = new AssistantMessageEventStream();
      stream.push({type: "done", reason: "stop", message});
      return stream;
    }
    requests.push(context);
    if (billedRunOwner === undefined) billedRunOwner = JSON.stringify(context.messages.at(-1)?.content).match(/\[PI GOAL ACTIVE goalId=([^\]]+)\]/)?.[1] ?? null;
    bills.push({goalId: billedRunOwner, tokens: 110});
    timeline.push({event: "request", count: requests.length});
    if (requests.length > 30) failure = new Error("Unbounded stop fixture continuation");
    const startSecondary = testing && !replaying && successor && !secondaryDone
      && (control !== "agent-resume" || (agentResumed && checkpoints.length > agentResumeCheckpoint))
      && (replacing ? typeof triggerGoalId === "string" && triggerGoalId !== primary.id : triggerGoalId === (switching ? secondary.id : primary.id));
    const staleFollowup = testing && boundary === "host-followup" && triggerGoalId === primary.id && !forbiddenOffered;
    if (staleFollowup) forbiddenOffered = true;
    const userWork = queuedUserSeen && !queuedUserDone;
    if (userWork) queuedUserDone = true;
    const retryError = testing && boundary === "provider-retry" && !retryOffered;
    if (retryError) retryOffered = true;
    const calls = failure || retryError ? [] : userWork ? [write("queued-user.txt"), ...(control === "steering-only" ? [pause] : [])] : staleFollowup ? [write("forbidden.txt")] : startSecondary ? [write("secondary-proof.txt"), pause] : responses.shift() ?? [];
    if (startSecondary) secondaryDone = true;
    if (controlledClock && boundary === "completion" && calls.some(call => call.name === "update_goal" && call.args.status === "complete")) clockNow += 8000;
    const content = calls.length ? calls.map((call, index) => ({type: "toolCall", id: `stop-${requests.length}-${index}`, name: call.name, arguments: call.args})) : [{type: "text", text: control === "clarify" ? "Which output format should I use?" : "Waiting for explicit authorization."}];
    const message = {role: "assistant", api: requestedModel.api, provider: requestedModel.provider, model: requestedModel.id, content,
      usage: {input: 100, output: 10, cacheRead: 0, cacheWrite: 0, totalTokens: 110, cost: {input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0}}, stopReason: retryError ? "error" : calls.length ? "toolUse" : "stop", ...(retryError ? {errorMessage: "503 Service Unavailable"} : {}), timestamp: Date.now()};
    const stream = new AssistantMessageEventStream();
    stream.push({type: "start", partial: message});
    const intervene = beforeResponse; beforeResponse = undefined;
    void (async () => {
      try { await intervene?.(); } catch (error) { failure = error; }
      if (boundary.startsWith("steering") && options.signal?.aborted) stream.push({type: "error", reason: "aborted", error: {...message, content: [], stopReason: "aborted"}});
      else if (retryError) stream.push({type: "error", reason: "error", error: message});
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
function assertBilling() {
  const records = new Map();
  for (const directory of [".pi/goals/archived", ".pi/goals"]) {
    const full = join(cwd, directory);
    if (!existsSync(full)) continue;
    for (const file of readdirSync(full).filter(file => file.endsWith(".md"))) {
      const record = parseGoalFile(join(full, file));
      if (record) records.set(record.id, record);
    }
  }
  for (const [id, record] of records) {
    const expected = bills.filter(bill => bill.goalId === id).reduce((sum, bill) => sum + bill.tokens, 0);
    assert.equal(record.usage.tokensUsed, expected, `executor usage belongs to the goal selected for its run: ${id}; bills=${JSON.stringify(bills)}`);
    if (controlledClock) assert.equal(record.usage.activeSeconds, record.id === primary.id ? boundary === "completion" ? 16 : 10 : 0, "active time includes creation and work before the stop, excluding the stopped response interval");
  }
  for (const bill of bills) if (bill.goalId) assert(records.has(bill.goalId), "the billed goal remains observable in active or archived storage");
  if (lateBudget) {
    assert.equal(records.get(primary.id).status, "budget_limited", "late usage exhausts the originating goal independently of focus");
    const events = readFileSync(goalLedgerPath({cwd}), "utf8").trim().split("\n").map(line => JSON.parse(line));
    assert.equal(events.filter(event => event.type === "goal_budget_limited" && event.goalId === primary.id).length, 1, "one durable budget transition despite subsequent responses and refresh");
  }
}
try {
  if (boundary === "completion") {
    mkdirSync(join(cwd, ".pi"));
    writeFileSync(join(cwd, ".pi", "pi-goal-x-settings.json"), JSON.stringify({disabled: true}));
  }
  if (reviewing) {
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    mkdirSync(join(cwd, ".pi"));
    writeFileSync(join(cwd, ".pi", "pi-goal-x-settings.json"), JSON.stringify({provider: "fixture", model: "reviewer", disabled: false, oracle: {enabled: boundary.startsWith("oracle") && control !== "disabled", provider: "fixture", ...(control === "config" ? {} : {model: "reviewer"}), projectResources: control === "resources", maxFailedAttemptsPerBlocker: 2}}));
    if (oracleFollowup) writeFileSync(join(cwd, "AGENTS.md"), "oracle-project-resource-sentinel");
  }
  host = await createAgentSessionRuntime(create, {cwd, agentDir, sessionManager: SessionManager.create(cwd, join(work, "sessions"))});
  host.setRebindSession(async current => { session = current; await bind(); });
  await bind();
  deadline = setTimeout(() => { failure = new Error("Stop fixture deadline exceeded"); void session.abort(); }, 8000);
  await run("Create a goal to verify explicit stop boundaries.", [
    {name: "create_goal", args: {objective: "Write only explicitly authorized fixture files; preserve user stop boundaries.", ...(lateBudget ? {token_budget: 440} : {})}},
    {name: "set_goal_tasks", args: {tasks: [{id: "work", title: "Write the authorized fixture proof"}]}},
    ...(boundary === "audit" ? [write("proof.txt"), {name: "update_goal_task", args: {task_id: "work", status: "complete", evidence: "proof.txt contains proof.txt"}}] : []), pause,
  ]);
  primary = structuredClone(currentGoal());
  assert.equal(primary.status, "paused");
  if (controlledClock) assert.equal(parseGoalFile(resolve(cwd, primary.activePath)).usage.activeSeconds, 8, "model creation starts its active clock before response settlement");
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
  const checkpointsBefore = checkpoints.length;
  testing = true;
  if (boundary !== "ordinary") await session.prompt("/goal-resume");
  if (boundary === "idle") {
    responses = control === "inspect" ? Array.from({length: 3}, () => [{name: "get_goal", args: {}}])
      : control === "echo" ? [[{name: "bash", args: {command: "echo inspecting"}}]]
      : control === "ls" ? [[{name: "ls", args: {path: "."}}]]
      : control === "work" || control === "redirect" ? [[control === "redirect" ? {name: "bash", args: {command: "echo progress > progress.txt"}} : write("progress.txt")], [], [pause]] : [];
    const worked = control === "work" || control === "redirect";
    const expectedResponses = control === "inspect" ? 4 : worked ? 3 : ["text", "clarify"].includes(control) ? 1 : 2;
    await delay(100);
    await settled();
    assert.equal(requests.length - before, expectedResponses, "only substantive work earns another automatic checkpoint; inspection remains allowed within the run");
    if (control === "ls") assert(results.some(result => result.toolName === "ls" && !result.isError), "inspection actually executed");
    if (control === "inspect") assert(requests.slice(before).every(request => JSON.stringify(request).includes("Do not call get_goal repeatedly")), "every inspection receives the existing soft guidance");
    assert.equal(parseGoalFile(resolve(cwd, primary.activePath)).status, worked ? "paused" : "active", "yielding for clarification does not mark the goal blocked or complete");
    if (control === "work") assert.equal(readFileSync(join(cwd, "progress.txt"), "utf8"), "progress.txt");
    if (control === "redirect") assert.equal(readFileSync(join(cwd, "progress.txt"), "utf8"), "progress\n");
    if (control === "clarify") assert(JSON.stringify(session.messages.at(-1)).includes("Which output format"), "the active goal can ask a real clarification question");
    responses = [[write("resumed-proof.txt"), pause]];
    await session.prompt(control === "clarify" ? "Use JSON and continue the requested work." : "/goal-resume");
    await delay(50);
    await settled();
    assert.equal(readFileSync(join(cwd, "resumed-proof.txt"), "utf8"), "resumed-proof.txt", "explicit resume can continue after a no-progress yield");
  } else if (oracleOutcome) {
    const block = {name: "update_goal", args: {status: "blocked", reason: "Fixture dependency remains unavailable."}};
    const ledger = () => readFileSync(goalLedgerPath({cwd}), "utf8").trim().split("\n").map(line => JSON.parse(line));
    await run("Report this concrete recurring blocker.", [block]);
    assert(JSON.stringify(requests[before]).includes("three consecutive goal turns"), "recurrence is delivered model guidance, not a runtime counter");
    if (["config", "provider", "malformed", "invalid-index"].includes(control)) {
      const errorCode = ["config", "provider"].includes(control) ? control : "invalid_output";
      assert.equal(currentGoal().status, "active");
      assert.equal(ledger().find(event => event.type === "oracle_failed").errorCode, errorCode);
      await run("Retry the same blocker consultation.", [block]);
      assert.equal(currentGoal().status, "active");
      const requestsBeforeCap = childRequests;
      await run("Report the blocker after the configured failure limit.", [block]);
      assert.equal(childRequests, requestsBeforeCap, "the configured cap prevents another consultation");
      assert.equal(ledger().filter(event => event.type === "oracle_started").length, 2);
    } else if (control !== "disabled") {
      assert.equal(ledger().find(event => event.type === "oracle_result").disposition, control);
    }
    assert.equal(currentGoal().status, "blocked");
    assert.equal(currentGoal().pauseReason, block.args.reason);
    if (["disabled", "config"].includes(control)) assert.equal(childRequests, 0, "no implicit fallback model is consulted");
  } else if (oracleFollowup) {
    const block = {name: "update_goal", args: {status: "blocked", reason: "Fixture dependency remains unavailable."}};
    const ledger = () => readFileSync(goalLedgerPath({cwd}), "utf8").trim().split("\n").map(line => JSON.parse(line));
    await run("Consult the Oracle about the recurring dependency failure.", [block]);
    await delay(50);
    assert.equal(currentGoal().status, "active", "actionable advice preserves the active goal");
    assert.equal(ledger().filter(event => event.type === "oracle_result").length, 1);
    for (const payload of childPayloads) {
      assert.deepEqual(payload.tools.map(tool => tool.function.name).sort(), ["read", "grep", "find", "ls", "submit_goal_oracle_advice"].sort(), "Oracle receives only its read-only tools");
      assert.equal(JSON.stringify(payload).includes("oracle-project-resource-sentinel"), control === "resources", "Oracle respects the configured project-resource policy");
      assert(!JSON.stringify(payload).includes("PI GOAL ACTIVE"), "Oracle cannot inherit the executor projection");
    }
    if (control === "two-blockers") await run("Consult about a different concrete blocker.", [{...block, args: {...block.args, reason: "A different fixture dependency remains unavailable."}}]);
    if (control === "reopen") {
      await session.prompt("/goal-pause");
      for (let i = 0; i < 3; i++) {
        await session.sendCustomMessage({customType: "oracle-fixture-ballast", content: "00112233445566778899 ".repeat(5000), display: false}, {triggerTurn: false});
        await session.compact();
      }
      assert.equal(summaries, 3, "three actual host summaries precede reopen");
      await host.switchSession(session.sessionManager.getSessionFile());
      await session.prompt("/goal-resume");
    }
    const inspectionStart = requests.length;
    await run("Inspect state and report the same blocker without attempting the advice.", [
      {name: "get_goal", args: {}}, {name: "bash", args: {command: control === "echo-variable" ? 'echo "$PWD"' : "echo inspecting"}}, {name: "ls", args: {path: "."}}, block,
    ]);
    assert.equal(currentGoal().status, "active", "inspection and another block request do not execute Oracle advice");
    assert(JSON.stringify(requests[inspectionStart].messages.at(-1)).includes("Late Oracle advice"), "durable advice is supplied before renewed work");
    assert(results.some(result => result.toolName === "ls" && !result.isError), "the executor performed actual inspection");
    assert.equal(ledger().filter(event => event.type === "oracle_followup_attempted").length, 0);
    if (control === "two-blockers") {
      await session.prompt("/goal-pause");
      await host.switchSession(session.sessionManager.getSessionFile());
      await session.prompt("/goal-resume");
    }
    await run("Attempt the advice, then report the still-recurring blocker.", [write("oracle-attempt.txt"), block]);
    assert.equal(readFileSync(join(cwd, "oracle-attempt.txt"), "utf8"), "oracle-attempt.txt");
    assert.equal(currentGoal().status, "blocked");
    assert.equal(ledger().filter(event => event.type === "oracle_started").length, control === "two-blockers" ? 2 : 1, "same fingerprint reuses its advice");
    assert.deepEqual(ledger().filter(event => event.type === "oracle_followup_attempted").map(event => event.firstToolName), ["write"]);
    assert.equal(ledger().find(event => event.type === "oracle_followup_attempted").fingerprint, ledger().find(event => event.type === "oracle_result").fingerprint, "work follows the original blocker when its advice is selected again");
  } else if (control === "serial") {
    const revision = results.findLast(result => result.details?.goal?.id === primary.id)?.details.work_revision;
    assert(revision);
    const pendingCall = boundary === "dialog"
      ? {name: "set_goal_tasks", args: {mode: "upsert", expected_work_revision: revision, tasks: [{id: "late", title: "Pending proposal before agent pause"}]}}
      : {name: "update_goal", args: {status: boundary === "audit" ? "complete" : "blocked", reason: "The same blocker persisted over three attempts."}};
    if (boundary === "dialog") { process.env.PI_GOAL_AUTO_CONFIRM = ""; duringDialog = pendingBarrier; }
    responses = [[pendingCall, pause, write("forbidden.txt")]];
    await session.prompt("Finish the pending review, then pause with the supplied reason and suggestion.");
    await settled();
    assert.equal(pauseDispatches, 1);
    assert.deepEqual(serialOrder, ["pending-entered", "pending-released", "agent-pause-dispatch"]);
    if (reviewing) { await childClosed; assert.equal(transportAborted, false, "the child finished before agent pause became executable"); }
  } else if (boundary === "ordinary") {
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
  } else if (boundary === "dashboard") {
    beforeResponse = () => {
      terminalInput("\x1b[116;6u");
      assert.deepEqual(terminalInput("\x1b"), {consume: true}, "expanded dashboard consumes Escape to collapse");
      beforeResponse = stop;
    };
    responses = [[write("dashboard-continued.txt")], [write("forbidden.txt")]];
    await session.prompt("Continue while the dashboard collapses, then honor the second Escape.");
    await settled();
    assert(existsSync(join(cwd, "dashboard-continued.txt")), "the first Escape only collapses the dashboard");
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
    if (boundary === "oracle" && control === "abort") assert.match(ledger, /"type":"oracle_failed".*"errorCode":"aborted"/, "Oracle cancellation remains visible after the conversation is gone");
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
    const resultIndex = results.length;
    responses = [[{name: "get_goal", args: {}}, write("forbidden.txt")]];
    replaying = true;
    await session.sendCustomMessage(old, {triggerTurn: true});
    replaying = false;
    assert.equal(existsSync(join(cwd, "forbidden.txt")), false, "a host-held old checkpoint cannot regain authority after resume");
    assert(results.slice(resultIndex).some(result => result.toolName === "get_goal" && !result.isError), "the stale run retains the read-only get_goal allowlist");
    await settled();
  } else if (boundary === "checkpoint-agent") {
    responses = [[pause, write("forbidden.txt")], ...(control === "agent-resume" ? [[write("forbidden.txt")]] : [])];
    await settled();
    const stoppedRequests = requests.length;
    await delay(50);
    assert.equal(checkpoints.length - checkpointsBefore, control === "agent-resume" ? 2 : 1, "only an explicit resume authorizes a successor checkpoint");
    assert.equal(requests.length, stoppedRequests, "the settled pause schedules no further requests");
    assert.equal(pauseDispatches, control === "agent-resume" ? 2 : 1);
    assert.equal(checkpoints.at(-1).details.goalId, primary.id);
  } else if (boundary === "queued") {
    responses = [[write("forbidden.txt")]];
    await stop();
    await delay(100);
    assert.equal(requests.length, before, "stopping a scheduled checkpoint issues no new request");
  } else if (boundary === "completion") {
    await run("Write proof and complete this goal with verified task evidence.", [write("proof.txt"), {name: "update_goal_task", args: {task_id: "work", status: "complete", expected_work_revision: results.findLast(result => result.details?.work_revision)?.details.work_revision, evidence: "proof.txt contains proof.txt"}}, {name: "update_goal", args: {status: "complete"}}]);
    const archived = parseGoalFile(join(cwd, ".pi", "goals", "archived", readdirSync(join(cwd, ".pi", "goals", "archived"))[0]));
    assert.equal(archived.taskList.tasks[0].status, "complete", "completion used accepted task evidence");
    assert.equal(archived.status, "complete");
  } else if (boundary === "provider-retry") {
    responses = [[write("retry-proof.txt"), pause]];
    await session.prompt("Perform the authorized work when the provider recovers, then pause.");
    await settled();
    assert.equal(hostRetries, 1, "Pi performs exactly one native provider retry");
    assert.equal(readFileSync(join(cwd, "retry-proof.txt"), "utf8"), "retry-proof.txt");
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
  } else if (agentStop) {
    if (controlledClock) beforeResponse = () => { clockNow += 2300; };
    responses = [[...(boundary === "agent-block" ? [] : [write("dispatched.txt")]), boundary === "agent-block" ? {name: "update_goal", args: {status: "blocked", reason: "Fixture dependency remains unavailable."}} : pause, write("forbidden.txt")]];
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
  if (process.argv.includes("--usage-fault")) {
    assert(failedUsageWrites > 0, "the original goal's late usage reaches the actual storage boundary");
    assert(notices.some(notice => /has not been saved|Could not save/.test(notice)), "unpaid usage is diagnosed");
    if (clearUnpaid) {
      await session.prompt("/goal-clear");
      assert.equal(existsSync(resolve(cwd, primary.activePath)), false, "clear archives the goal while earlier usage remains unpaid");
    }
    faultGoalId = undefined;
    const priorRequests = requests.length;
    await session.prompt("/goal-refresh");
    assert.equal(requests.length, priorRequests, "retrying usage does not start goal work");
  }
  if (process.argv.includes("--accounting")) assertBilling();
  if (exhaustedEdit) {
    const path = resolve(cwd, primary.activePath), content = readFileSync(path, "utf8"), split = content.indexOf("\n\n# Goal Prompt");
    const metadata = JSON.parse(content.slice(0, split));
    metadata.tokenBudget = metadata.usage.tokensUsed;
    writeFileSync(path, JSON.stringify(metadata) + content.slice(split));
    await session.prompt("/goal-refresh");
    const count = requests.length;
    responses = [[write("forbidden-budget-edit.txt")]];
    await session.prompt("/goal-resume");
    await delay(100);
    assert.equal(requests.length, count, "selecting an active but exhausted goal cannot bypass resume validation");
    await session.prompt("/goal-focus");
    await delay(100);
    assert.equal(requests.length, count, "focus cannot dispatch exhausted work");
    assert.equal(existsSync(join(cwd, "forbidden-budget-edit.txt")), false);
    assert.equal(parseGoalFile(path).status, "budget_limited");
  }
  responses = [];
  await run("Write ordinary-user.txt as a new, explicit ordinary user request.", [write("ordinary-user.txt")]);
  assert.equal(readFileSync(join(cwd, "ordinary-user.txt"), "utf8"), "ordinary-user.txt", "fresh user work remains available after a goal stop");
  await run("Inspect the focused goal without resuming work.", [{name: "get_goal", args: {}}]);
  const focused = results.at(-1).details.goal;
  if (process.argv.includes("--accounting")) assertBilling();
  if (exhaustedEdit) assert.equal(focused.status, "budget_limited");
  else if (boundary === "completion" || clearUnpaid || (["unfocus", "clear"].includes(control) && boundary !== "agent")) assert.equal(focused, null);
  else if (switching && boundary !== "agent") assert.equal(focused.id, secondary.id);
  else assert.equal(focused.status, boundary === "agent-block" || oracleFollowup || oracleOutcome ? "blocked" : "paused");
  if (["agent", "checkpoint-agent"].includes(boundary) || control === "serial") {
    assert.equal(focused.pauseReason, pause.args.reason);
    assert.equal(focused.pauseSuggestedAction, pause.args.suggested_action);
  }
  console.log(JSON.stringify({passed: true, boundary, control, requests: requests.length, toolResults: results.map(result => ({name: result.toolName, isError: result.isError}))}));
} catch (error) {
  console.error(JSON.stringify({testing, responses, notices, timeline, results: results.map(result => ({tool: result.toolName, content: result.content}))}));
  throw error;
} finally {
  Date.now = originalNow;
  fs.renameSync = originalRename;
  syncBuiltinESMExports();
  clearTimeout(deadline);
  await session?.abort();
  await host?.dispose();
  if (reviewing) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  rmSync(work, {recursive: true, force: true});
}
