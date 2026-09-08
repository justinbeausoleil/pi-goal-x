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
const recovery = boundary === "recovery";
const compactionFailure = recovery && control.startsWith("compaction-");
const compactionSuccessor = process.argv.find(arg => arg.startsWith("--compaction-successor="))?.split("=")[1];
const compactionOutcomes = [];
const recoveryTimers = [];
const originalTimeout = globalThis.setTimeout, originalClearTimeout = globalThis.clearTimeout;
if (recovery) {
  globalThis.setTimeout = (callback, milliseconds, ...args) => {
    if (![5000, 10000].includes(milliseconds)) return originalTimeout(callback, milliseconds, ...args);
    assert(session.isIdle, "extension backoff must wait for actual host settlement");
    const handle = originalTimeout(() => {}, 60000);
    handle.unref();
    recoveryTimers.push({handle, milliseconds, callback: () => callback(...args), active: true});
    return handle;
  };
  globalThis.clearTimeout = handle => {
    const timer = recoveryTimers.find(timer => timer.handle === handle);
    if (timer) timer.active = false;
    originalClearTimeout(handle);
  };
}
const pendingRecovery = () => recoveryTimers.filter(timer => timer.active);
async function advanceRecovery() {
  assert.equal(pendingRecovery().length, 1, "exactly one recovery is pending");
  const timer = pendingRecovery()[0];
  clearTimeout(timer.handle);
  timer.callback();
  await delay(100);
  await settled();
}
const clearUnpaid = process.argv.includes("--clear-unpaid");
const lateBudget = process.argv.includes("--late-budget");
const exhaustedEdit = process.argv.includes("--exhausted-edit");
const controlledClock = process.argv.includes("--clock");
const originalNow = Date.now;
let clockNow = originalNow();
if (controlledClock) Date.now = () => clockNow;
const switching = control.startsWith("switch");
const replacing = control.startsWith("replace");
const successor = !recovery && boundary !== "oracle-followup" && (replacing || ["switch-active", "pause-resume", "reload", "reopen", "agent-resume"].includes(control));
const oracleFollowup = boundary === "oracle-followup";
const oracleOutcome = boundary === "oracle-outcome";
const auditOutcome = boundary === "audit-outcome";
const reviewReopen = process.argv.includes("--review-reopen");
const reviewLedgerFailure = process.argv.includes("--review-ledger-failure");
const completionWriteFailure = process.argv.includes("--completion-write-failure");
const reviewWriteFailure = process.argv.includes("--review-write-failure");
const auditCancelled = auditOutcome && control.startsWith("cancel-");
const planningGate = auditOutcome && ["optional-pending", "required-pending"].includes(control);
const auditSkipped = auditOutcome && (planningGate || control.startsWith("disabled-") || control === "per-goal" || control === "cancel-skip");
const auditStopped = auditOutcome && control.endsWith("-paused");
const archiveFailure = process.argv.find(arg => arg.startsWith("--archive-failure="))?.split("=")[1];
const archiveReopen = process.argv.includes("--archive-reopen");
const archiveRepairRace = process.argv.find(arg => arg.startsWith("--archive-repair-race="))?.split("=")[1];
let repairRaceFired = false;
let allowArchiveRetry = false, confirmArchiveRepair = false, archiveWrites = 0, failedArchives = 0;
const reviewing = boundary === "audit" || boundary === "oracle" || oracleFollowup || oracleOutcome || auditOutcome;
const agentStop = boundary === "agent" || boundary === "agent-block";
let retryOffered = false, hostRetries = 0;
const work = process.argv.find(arg => arg.startsWith("--archive-work="))?.slice("--archive-work=".length) ?? mkdtempSync(join(tmpdir(), "goal-stop-native-"));
const cwd = join(work, "project"), agentDir = join(work, "agent");
mkdirSync(cwd, {recursive: true}); mkdirSync(agentDir, {recursive: true});
process.env.PI_OFFLINE = "1";
process.env.PI_CODING_AGENT_DIR = agentDir;
process.env.PI_GOAL_GLOBAL_SETTINGS_FILE = join(agentDir, "goal-settings.json");
process.env.PI_GOAL_AUTO_CONFIRM = "1";
const settings = SettingsManager.inMemory({compaction: {enabled: false}, retry: {enabled: boundary === "provider-retry", maxRetries: 2, baseDelayMs: 1}});
const model = {id: "synthetic", name: "Synthetic", provider: "openai", api: "openai-completions", baseUrl: "http://127.0.0.1:1", reasoning: false, input: ["text"], contextWindow: 65536, maxTokens: 8192, cost: {input: 0, output: 0, cacheRead: 0, cacheWrite: 0}};
const results = [], errors = [], requests = [], notices = [], statuses = [];
const widgetFrames = [];
let goalWidget;
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
let failedCompletionWrites = 0;
let failedReviewWrites = 0;
let failedLedgerWrites = 0;
const originalAppend = fs.appendFileSync;
fs.appendFileSync = (path, ...args) => {
  if (reviewLedgerFailure && testing && String(path).endsWith("goal_events.jsonl")) {
    failedLedgerWrites++;
    throw Object.assign(new Error("Synthetic review ledger failure"), {code: "EACCES"});
  }
  return originalAppend(path, ...args);
};
const originalRename = fs.renameSync;
fs.renameSync = (from, to) => {
  if (archiveFailure && testing && String(to).includes("/archived/")) {
    archiveWrites++;
    if (!allowArchiveRetry && archiveFailure === "write") {
      failedArchives++;
      throw Object.assign(new Error("Synthetic archive write failure"), {code: "EACCES"});
    }
  }
  if (reviewWriteFailure && testing && String(to).includes("/active_goal_") && parseGoalFile(String(from))?.latestReview) {
    failedReviewWrites++;
    throw Object.assign(new Error("Synthetic review write failure"), {code: "EACCES"});
  }
  if (completionWriteFailure && testing && String(to).includes("/active_goal_") && parseGoalFile(String(from))?.status === "complete") {
    failedCompletionWrites++;
    throw Object.assign(new Error("Synthetic completion write failure"), {code: "EACCES"});
  }
  if (faultGoalId && String(to).endsWith(".md") && String(to).includes(faultGoalId) && !(clearUnpaid && String(to).includes("/archived/"))) {
    failedUsageWrites++;
    throw Object.assign(new Error("Synthetic unpaid-usage write failure"), {code: "EACCES"});
  }
  return originalRename(from, to);
};
const originalUnlink = fs.unlinkSync;
fs.unlinkSync = path => {
  if (archiveFailure === "unlink" && testing && !allowArchiveRetry && String(path).includes("/active_goal_") && parseGoalFile(String(path))?.status === "complete") {
    failedArchives++;
    throw Object.assign(new Error("Synthetic archive unlink failure"), {code: "EACCES"});
  }
  return originalUnlink(path);
};
const originalCopy = fs.copyFileSync;
fs.copyFileSync = (source, target, ...args) => {
  if (archiveRepairRace && !repairRaceFired && allowArchiveRetry && String(source).includes("/active_goal_") && ["copy", "backup", "failure"].includes(archiveRepairRace)) {
    repairRaceFired = true;
    if (archiveRepairRace === "failure") throw new Error("Synthetic archive backup failure");
    if (archiveRepairRace === "copy") originalAppend(source, "\nreview-recovery-user-note");
    originalCopy(source, target, ...args);
    if (archiveRepairRace === "backup") originalAppend(source, "\nreview-recovery-user-note");
    return;
  }
  return originalCopy(source, target, ...args);
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
  if (childRequests === 1 && !oracleFollowup && !oracleOutcome && !auditOutcome) { await stop(); await delay(30); }
  if (childRequests === 1 && auditCancelled) { assert.deepEqual(terminalInput("\x1b"), {consume: true}); await delay(30); }
  if (childRequests === 1 && auditOutcome && control === "stale-work") editPrimaryMetadata(record => { record.taskList.tasks[0].title = "A new user requirement arrived during the audit"; });
  if (res.destroyed) return;
  if ((oracleOutcome || auditOutcome) && control === "provider") { res.writeHead(401); res.end(JSON.stringify({error: {message: "Synthetic review provider failure"}})); return; }
  res.writeHead(200, {"content-type": "text/event-stream"});
  const submit = boundary.startsWith("oracle") && control !== "malformed" && !payload.messages.some(message => message.role === "tool");
  const offered = {...advice, ...(["needs_human", "insufficient_context"].includes(control) ? {disposition: control} : {}), ...(control === "invalid-index" ? {recommendedIndex: 3} : {})};
  const auditRead = auditOutcome && !payload.messages.some(message => message.role === "tool");
  const artifactWrong = JSON.stringify(payload.messages.filter(message => message.role === "tool")).includes("wrong");
  const rejectionReport = "proof.txt contains wrong instead of verified.\n" + (reviewReopen ? "Retained finding: repair the actual proof artifact.\n".repeat(100) : "") + "<disapproved/>";
  if (auditOutcome) {
    assert(JSON.stringify(payload.messages).includes("proof.txt must contain verified"), "the auditor receives the retained contract");
    assert(!payload.tools.some(tool => ["create_goal", "update_goal", "set_goal_tasks", "update_goal_task"].includes(tool.function.name)));
    if (!auditRead) assert(JSON.stringify(payload.messages.filter(message => message.role === "tool")).includes(readFileSync(join(cwd, "proof.txt"), "utf8")), "the auditor actually read the workspace artifact");
  }
  const delta = auditRead ? {role: "assistant", tool_calls: [{index: 0, id: "audit-read", type: "function", function: {name: "read", arguments: JSON.stringify({path: "proof.txt"})}}]}
    : submit ? {role: "assistant", tool_calls: [{index: 0, id: "advice", type: "function", function: {name: "submit_goal_oracle_advice", arguments: JSON.stringify(offered)}}]}
    : {role: "assistant", content: auditOutcome ? (artifactWrong ? rejectionReport : control === "malformed" ? "The artifact was inspected; no verdict supplied." : "proof.txt contains verified.\n<approved/>") : boundary === "audit" ? (control === "serial" ? "More work is required.\n<disapproved/>" : "Late approval\n<approved/>") : "Advice recorded."};
  for (const [d, finish_reason] of [[delta, null], [{}, submit || auditRead ? "tool_calls" : "stop"]]) res.write(`data: ${JSON.stringify({id: "stop-review", object: "chat.completion.chunk", created: 1, model: "reviewer", choices: [{index: 0, delta: d, finish_reason}]})}\n\n`);
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
  else if (control === "new-session") await host.newSession();
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
    notify: message => notices.push(message), setStatus: (_key, value) => statuses.push(value),
    setWidget: (_key, factory) => {
      if (auditOutcome) goalWidget = typeof factory === "function" ? factory({requestRender() {}}, {fg: (_color, value) => value, bg: (_color, value) => value, bold: value => value}) : undefined;
    }, setEditorText() {},
    onTerminalInput: handler => { terminalInput = handler; return () => {}; },
    confirm: async title => {
      if (archiveFailure && /repair|archive|stale lock/i.test(title)) {
        if (confirmArchiveRepair && !repairRaceFired && ["edit", "session"].includes(archiveRepairRace)) {
          repairRaceFired = true;
          if (archiveRepairRace === "session") await host.newSession();
          else originalAppend(resolve(cwd, primary.activePath), "\nreview-recovery-user-note");
        }
        return confirmArchiveRepair;
      }
      return title === "Clear goal?";
    },
    select: async (_title, choices) => choices.find(choice => choice.includes(selectId)),
    custom: async () => {
      dialogSeen = true;
      if (auditCancelled) return control === "cancel-skip" ? "complete_without_audit" : "continue_working";
      if (boundary === "audit") return "continue_working";
      if (control === "esc") { assert.equal(terminalInput("\x1b"), undefined); return {decision: "cancel"}; }
      await duringDialog?.();
      return {decision: control === "serial" ? "cancel" : "confirm"};
    },
  }});
}
async function create({sessionManager, sessionStartEvent}) {
  const loader = new DefaultResourceLoader({cwd, agentDir, settingsManager: settings, noSkills: true, noPromptTemplates: true, noThemes: true, noContextFiles: true,
    systemPrompt: "Perform only the explicitly authorized fixture work.", additionalExtensionPaths: [process.env.PI_GOAL_TEST_EXTENSION ?? fileURLToPath(new URL("../extensions/goal.ts", import.meta.url))],
    extensionFactories: [pi => {
      pi.on("agent_start", () => { billedRunOwner = undefined; });
      pi.on("tool_result", event => {
        results.push(event);
        if (auditOutcome && testing && event.toolName === "update_goal") {
          if (goalWidget) widgetFrames.push(goalWidget.render(140).join("\n"));
          if (event.details?.goal?.status === "complete") {
            assert.equal(parseGoalFile(resolve(cwd, event.details.goal.activePath)).status, "complete", "the executor receives the committed result before deferred archival");
            assert(!existsSync(join(cwd, ".pi/goals/archived")), "archival has not run at the completion tool result");
            if (archiveFailure === "crash") {
              writeFileSync(join(work, "crash.json"), JSON.stringify({primary: event.details.goal, sessionFile: session.sessionManager.getSessionFile()}));
              // Abruptly end the actual host before turn_end or shutdown can archive.
              process.exit(0);
            }
          }
        }
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
    if (event.type === "compaction_end") compactionOutcomes.push(event);
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
      if (compactionFailure && compactionSuccessor) {
        void (async () => {
          if (compactionSuccessor === "replace") await session.prompt("/goal-direct Write resumed-proof.txt and pause the new goal.");
          else { await session.prompt("/goal-pause"); await session.prompt("/goal-resume"); }
          settings.setCompactionEnabled(false);
          session.abortCompaction();
          assert(options.signal.aborted);
          stream.push({type: "error", reason: "aborted", error: {...message, stopReason: "aborted", errorMessage: "Old summary cancelled after new user authorization"}});
        })().catch(error => { failure = error; stream.push({type: "error", reason: "error", error: {...message, stopReason: "error", errorMessage: String(error)}}); });
      } else if (compactionFailure) {
        if (control.endsWith("cancelled")) { session.abortCompaction(); assert(options.signal.aborted); }
        stream.push({type: "error", reason: control.endsWith("cancelled") ? "aborted" : "error", error: {...message, stopReason: control.endsWith("cancelled") ? "aborted" : "error", errorMessage: "Synthetic compaction failure"}});
      } else stream.push({type: "done", reason: "stop", message});
      return stream;
    }
    requests.push(context);
    if (billedRunOwner === undefined) billedRunOwner = JSON.stringify(context.messages.at(-1)?.content).match(/\[PI GOAL ACTIVE goalId=([^\]]+)\]/)?.[1] ?? null;
    bills.push({goalId: billedRunOwner, tokens: 110});
    timeline.push({event: "request", count: requests.length});
    if (requests.length > (reviewReopen ? 45 : 30)) failure = new Error("Unbounded stop fixture continuation");
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
    const recoveryFailure = recovery ? calls[0]?.failure : undefined;
    if (auditOutcome) for (const call of calls) if (call.name === "update_goal_task") call.args.expected_work_revision = results.findLast(result => result.details?.work_revision)?.details.work_revision;
    if (startSecondary) secondaryDone = true;
    if (controlledClock && boundary === "completion" && calls.some(call => call.name === "update_goal" && call.args.status === "complete")) clockNow += 8000;
    const content = recoveryFailure ? [] : calls.length ? calls.map((call, index) => ({type: "toolCall", id: `stop-${requests.length}-${index}`, name: call.name, arguments: call.args})) : [{type: "text", text: control === "clarify" ? "Which output format should I use?" : "Waiting for explicit authorization."}];
    const message = {role: "assistant", api: requestedModel.api, provider: requestedModel.provider, model: requestedModel.id, content,
      usage: {input: 100, output: 10, cacheRead: 0, cacheWrite: 0, totalTokens: 110, cost: {input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0}}, stopReason: retryError ? "error" : calls.length ? "toolUse" : "stop", ...(retryError ? {errorMessage: "503 Service Unavailable"} : {}), ...recoveryFailure, timestamp: Date.now()};
    if (compactionFailure && testing && !calls.length) message.usage = {...message.usage, input: 50000, totalTokens: 50010};
    const stream = new AssistantMessageEventStream();
    stream.push({type: "start", partial: message});
    const intervene = beforeResponse; beforeResponse = undefined;
    void (async () => {
      try { await intervene?.(); } catch (error) { failure = error; }
      if (boundary.startsWith("steering") && options.signal?.aborted) stream.push({type: "error", reason: "aborted", error: {...message, content: [], stopReason: "aborted"}});
      else if (retryError || recoveryFailure) {
        if (recoveryFailure?.stopReason === "aborted") assert.equal(options.signal.aborted, false, "transport abort is distinct from a user abort signal");
        stream.push({type: "error", reason: message.stopReason, error: message});
      }
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
    if ((!responses.length || (recovery && testing)) && session.isIdle && (!testing || !successor || secondaryDone)) return;
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
function editPrimaryMetadata(edit) {
  const path = resolve(cwd, primary.activePath), content = readFileSync(path, "utf8"), split = content.indexOf("\n\n# Goal Prompt");
  const record = JSON.parse(content.slice(0, split));
  edit(record);
  writeFileSync(path, JSON.stringify(record) + content.slice(split));
}
try {
  if (recovery) {
    mkdirSync(join(cwd, ".pi"));
    writeFileSync(join(cwd, ".pi", "pi-goal-x-settings.json"), JSON.stringify({networkRecovery: {maxAttempts: control === "unbounded" ? 0 : 3, maxDelayMs: 10000}}));
  }
  if (boundary === "completion") {
    mkdirSync(join(cwd, ".pi"));
    writeFileSync(join(cwd, ".pi", "pi-goal-x-settings.json"), JSON.stringify({disabled: true}));
  }
  if (reviewing) {
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    mkdirSync(join(cwd, ".pi"), {recursive: true});
    writeFileSync(join(cwd, ".pi", "pi-goal-x-settings.json"), JSON.stringify({provider: "fixture", model: "reviewer", disabled: false, oracle: {enabled: boundary.startsWith("oracle") && control !== "disabled", provider: "fixture", ...(control === "config" ? {} : {model: "reviewer"}), projectResources: control === "resources", maxFailedAttemptsPerBlocker: 2}}));
    if (auditOutcome && control.startsWith("disabled-")) {
      const settingsFile = join(cwd, ".pi", "pi-goal-x-settings.json");
      if (control === "disabled-global") writeFileSync(settingsFile, "{}");
      writeFileSync(control === "disabled-global" ? process.env.PI_GOAL_GLOBAL_SETTINGS_FILE : settingsFile, JSON.stringify({disabled: true, provider: "fixture", model: "reviewer"}));
    }
    if (planningGate) writeFileSync(join(cwd, ".pi/pi-goal-x-settings.json"), JSON.stringify({disabled: true}));
    if (auditOutcome && control === "approved-global-model") {
      writeFileSync(join(cwd, ".pi/pi-goal-x-settings.json"), "{}");
      writeFileSync(process.env.PI_GOAL_GLOBAL_SETTINGS_FILE, JSON.stringify({provider: "fixture", model: "reviewer"}));
    }
    if (oracleFollowup) writeFileSync(join(cwd, "AGENTS.md"), "oracle-project-resource-sentinel");
  }
  const crashed = archiveReopen ? JSON.parse(readFileSync(join(work, "crash.json"), "utf8")) : undefined;
  host = await createAgentSessionRuntime(create, {cwd, agentDir, sessionManager: crashed ? SessionManager.open(crashed.sessionFile) : SessionManager.create(cwd, join(work, "sessions")), ...(crashed ? {sessionStartEvent: {type: "session_start", reason: "resume"}} : {})});
  host.setRebindSession(async current => { session = current; await bind(); });
  await bind();
  deadline = setTimeout(() => { failure = new Error("Stop fixture deadline exceeded"); void session.abort(); }, 8000);
  if (!crashed) {
   await run("Create a goal to verify explicit stop boundaries.", [
    {name: "create_goal", args: {objective: "Write only explicitly authorized fixture files; preserve user stop boundaries.", ...(lateBudget ? {token_budget: 440} : {})}},
    {name: "set_goal_tasks", args: {tasks: [{id: "work", title: "Write the authorized fixture proof", ...(auditOutcome && !planningGate ? {verification_contract: "proof.txt must contain verified"} : {})}], ...(planningGate ? {block_completion: control === "required-pending"} : {})}},
    ...((boundary === "audit" || auditOutcome) && !planningGate ? [{name: "write", args: {path: "proof.txt", content: auditOutcome ? control === "disapproved" ? "wrong" : "verified" : "proof.txt"}}, {name: "update_goal_task", args: {task_id: "work", status: "complete", evidence: auditOutcome ? "Executor claims proof.txt contains verified" : "proof.txt contains proof.txt"}}] : []), pause,
  ]);
  primary = structuredClone(currentGoal());
  assert.equal(primary.status, "paused");
  } else primary = crashed.primary;
  if (auditOutcome && control === "per-goal") {
    editPrimaryMetadata(record => { record.skipAuditor = true; });
    await session.prompt("/goal-refresh");
  }
  if (auditOutcome && control === "approved-limited") {
    editPrimaryMetadata(record => { record.tokenBudget = record.usage.tokensUsed + 110; });
    await session.prompt("/goal-refresh");
  }
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
  if (compactionFailure) {
    await session.sendCustomMessage({customType: "recovery-ballast", content: "Historical context ballast. ".repeat(10000), display: false}, {triggerTurn: false});
    settings.setCompactionEnabled(true);
  }
  testing = true;
  if (boundary !== "ordinary" && !auditStopped && !archiveReopen) await session.prompt("/goal-resume");
  if (auditOutcome) {
    if (control === "required-pending") {
      await run("Request completion with a pending required planning task.", [{name: "update_goal", args: {status: "complete"}}]);
      assert.equal(childRequests, 0);
      assert.equal(parseGoalFile(resolve(cwd, primary.activePath)).status, "active");
      assert.match(JSON.stringify(results.findLast(result => result.toolName === "update_goal").content), /pending.*blockCompletion/);
      await run("Explicitly skip this uncontracted planning task with a reason.", [{name: "update_goal_task", args: {task_id: "work", status: "skipped", reason: "The optional planning exercise is no longer needed."}}]);
      assert.equal(parseGoalFile(resolve(cwd, primary.activePath)).taskList.tasks[0].status, "skipped", "the public skip persists before retrying completion");
    }
    if (control === "approved-limited") {
      await run("Inspect while the remaining budget is consumed.", [{name: "get_goal", args: {}}]);
      assert.equal(parseGoalFile(resolve(cwd, primary.activePath)).status, "budget_limited", "native response accounting exhausts the budget before completion");
    }
    if (control === "approved-after-blocked") {
      await run("Report the concrete unresolved blocker.", [{name: "update_goal", args: {status: "blocked", reason: "The fixture dependency remains unavailable."}}]);
      await run("Request completion while blocked.", [{name: "update_goal", args: {status: "complete"}}]);
      assert.equal(childRequests, 0, "blocked goals cannot start the auditor");
      assert.equal(parseGoalFile(resolve(cwd, primary.activePath)).status, "blocked");
      assert.match(JSON.stringify(results.findLast(result => result.toolName === "update_goal").content), /blocked.*user to resume/);
      await session.prompt("/goal-resume");
    }
    if (!archiveReopen) await run("Complete only if the independent review permits it.", [{name: "update_goal", args: {status: "complete"}}]);
    const skipped = auditSkipped;
    if (archiveReopen || (skipped && !auditCancelled)) assert.equal(childRequests, 0, "recovery and disabled settings do not run the child auditor");
    else assert(childRequests > 0, "the actual child transport ran");
    const completed = !completionWriteFailure && (skipped || control.startsWith("approved"));
    const file = completed && !archiveFailure ? join(cwd, ".pi/goals/archived", readdirSync(join(cwd, ".pi/goals/archived")).find(name => name.includes(primary.id))) : resolve(cwd, primary.activePath);
    const record = parseGoalFile(file);
    assert.equal(record.status, completed ? "complete" : auditStopped ? "paused" : "active");
    if (reviewWriteFailure) {
      assert(failedReviewWrites > 0);
      const result = results.findLast(result => result.toolName === "update_goal");
      assert(!result.isError, "review persistence failure returns an actionable tool result");
      assert.match(JSON.stringify(result.content), /Could not retain.*review.*not completed/i);
      assert(JSON.stringify(result.content).includes("proof.txt contains wrong"), "the unpersisted findings remain visible in the tool result");
      assert.equal(record.latestReview, undefined);
    } else if (control === "stale-work") {
      assert.equal(record.latestReview, undefined, "a stale review cannot become authoritative");
      assert.match(JSON.stringify(results.findLast(result => result.toolName === "update_goal").content), /completion failed.*not completed/i);
      assert.equal(record.taskList.tasks[0].title, "A new user requirement arrived during the audit");
    } else if (completionWriteFailure) {
      assert(failedCompletionWrites > 0, "the completion commit reached the failing storage boundary");
      assert.match(JSON.stringify(results.findLast(result => result.toolName === "update_goal").content), /completion failed.*not completed/i);
      assert(!session.messages.some(message => message.role === "custom" && message.customType === "pi-goal-audit-event" && ["approved", "skipped"].includes(message.details?.phase)), "failed completion cannot publish a successful audit/completion card");
      assert(!statuses.some(status => status?.includes("complete")));
    } else {
      assert.equal(record.latestReview?.outcome, skipped ? "audit_skipped" : auditCancelled ? "cancelled" : control.startsWith("approved") ? "approved" : control === "provider" ? "error" : control, "the latest outcome survives independently of the ledger");
      if (skipped) assert.equal(record.latestReview.bypassOrigin, control === "per-goal" ? "per_goal" : control === "cancel-skip" ? "user_choice" : "settings");
      if (auditStopped && auditCancelled) assert.match(JSON.stringify(results.findLast(result => result.toolName === "update_goal").content), /remains paused/);
      assert(record.latestReview.report.length > 0);
      assert.match(record.latestReview.workRevision, /^[a-f0-9]{64}$/);
      if (completed && !archiveReopen) {
        const label = skipped ? "complete (audit skipped)" : "complete (audited)";
        assert(readFileSync(file, "utf8").includes(`Status: ${label}`), "archive labels the completion origin");
        assert(widgetFrames.some(frame => skipped ? frame.includes(label) : /APPROVED|complete \(audited\)/.test(frame)), `the live widget labels the completion origin: ${JSON.stringify(widgetFrames)}`);
      }
    }
    if (!completed) await session.prompt("/goal-pause");
    if (archiveFailure) {
      if (!archiveReopen) {
        assert(failedArchives > 0);
        assert(notices.some(notice => /Failed to archive completed goal/.test(notice)));
        await host.switchSession(session.sessionManager.getSessionFile());
      }
      const requestCount = requests.length, childCount = childRequests;
      let activeBytes = readFileSync(file);
      await session.prompt("/goal-status");
      assert.match(notices.at(-1), /No goal|unfocused/i, "the completed record is outside the open pool after reopen");
      await session.prompt("/goal-recovery");
      assert(notices.at(-1).includes(primary.id) && /complete.*unarchived/i.test(notices.at(-1)), "recovery discovers completed records outside the open pool");
      assert.deepEqual(readFileSync(file), activeBytes, "the report is read-only");
      await session.prompt("/goal-recovery repair");
      assert.deepEqual(readFileSync(file), activeBytes, "cancelled repair is a durable no-op");
      assert(!existsSync(join(cwd, ".pi/goals/.recovery-backup")));
      allowArchiveRetry = true; confirmArchiveRepair = true;
      await session.prompt("/goal-recovery repair");
      if (archiveRepairRace) {
        assert(repairRaceFired);
        assert(existsSync(file), "an obsolete or failed repair preserves the authoritative record");
        if (archiveRepairRace !== "session") assert.match(notices.at(-1), /failed|changed/i);
        const expected = ["edit", "copy", "backup"].includes(archiveRepairRace) ? Buffer.concat([activeBytes, Buffer.from("\nreview-recovery-user-note")]) : activeBytes;
        assert.deepEqual(readFileSync(file), expected, "repair cannot overwrite concurrent user content");
        activeBytes = expected;
        assert.equal(requests.length, requestCount);
        await session.prompt("/goal-recovery repair");
      }
      assert(!existsSync(file), "confirmed repair archives the completed record without another executor turn");
      const archivedFiles = readdirSync(join(cwd, ".pi/goals/archived")).filter(name => name.endsWith(".md"));
      assert.equal(archivedFiles.length, 1, "retry retains one archive copy");
      const archived = parseGoalFile(join(cwd, ".pi/goals/archived", archivedFiles[0]));
      assert.equal(archived.status, "complete");
      assert.deepEqual(archived.latestReview, record.latestReview);
      const backups = join(cwd, ".pi/goals/.recovery-backup");
      assert(readdirSync(backups).some(directory => readdirSync(join(backups, directory)).some(name => readFileSync(join(backups, directory, name)).equals(activeBytes))), "the pre-repair completed record is backed up exactly");
      const writeCount = archiveWrites;
      await session.prompt("/goal-recovery repair");
      assert.equal(archiveWrites, writeCount, "repeated repair does not archive twice");
      assert.equal(requests.length, requestCount);
      assert.equal(childRequests, childCount);
      const ledger = readFileSync(goalLedgerPath({cwd}), "utf8").trim().split("\n").map(line => JSON.parse(line));
      assert.equal(ledger.filter(event => event.type === "goal_completed").length, 1);
      assert.equal(ledger.filter(event => event.type === "goal_archived").length, 1);
    }
    if (reviewReopen) {
      assert.equal(record.latestReview.outcome, "disapproved");
      for (let i = 0; i < 3; i++) {
        await session.sendCustomMessage({customType: "review-fixture-ballast", content: "00112233445566778899 ".repeat(5000), display: false}, {triggerTurn: false});
        await session.compact();
      }
      assert.equal(summaries, 3);
      await host.switchSession(session.sessionManager.getSessionFile());
      assert.deepEqual(parseGoalFile(resolve(cwd, primary.activePath)).latestReview, record.latestReview);
      const projectedAt = requests.length;
      await run("Inspect the saved goal after reopening.", [{name: "get_goal", args: {}}]);
      const projection = JSON.stringify(requests[projectedAt].messages.at(-1));
      assert(projection.includes("proof.txt contains wrong instead of verified"), "authoritative rejection is supplied even without ledger history");
      assert(projection.includes('section=\\"review\\"'), "next response can retrieve the full review");
      let cursor, fullReview = "", pages = 0;
      do {
        await run("Read the next review page.", [{name: "get_goal", args: {section: "review", ...(cursor ? {cursor} : {})}}]);
        const page = results.at(-1).details?.page;
        assert(page, "review is available through the public detail tool");
        assert(page.content.length <= 4000);
        fullReview += page.content;
        cursor = page.nextCursor;
        assert(++pages <= 4, "bounded pagination terminates");
      } while (cursor);
      assert(pages > 1);
      assert.deepEqual(JSON.parse(fullReview), record.latestReview, "the complete report survives losslessly");
      if (reviewLedgerFailure) {
        assert(failedLedgerWrites > 0);
        assert(!readFileSync(goalLedgerPath({cwd}), "utf8").includes('"type":"audit_result"'));
      }
      await session.prompt("/goal-resume");
      await run("Repair the actual artifact, then request a fresh independent review.", [
        {name: "write", args: {path: "proof.txt", content: "verified"}},
        {name: "update_goal", args: {status: "complete"}},
      ]);
      const archived = parseGoalFile(join(cwd, ".pi/goals/archived", readdirSync(join(cwd, ".pi/goals/archived")).find(name => name.includes(primary.id))));
      assert.equal(archived.status, "complete");
      assert.equal(archived.latestReview.outcome, "approved");
      assert.equal(childRequests, 4, "each review independently reads the current artifact");
    }
  } else if (compactionFailure) {
    responses = control.includes("overflow")
      ? [[{failure: {stopReason: "error", errorMessage: "maximum context length exceeded"}}], [write("forbidden.txt"), pause]]
      : [[write("before-compaction.txt")], [], [write(compactionSuccessor ? "resumed-proof.txt" : "forbidden.txt"), pause]];
    await delay(100); await settled(); await delay(100);
    assert(summaries > 0, "actual native compaction requested a summary");
    assert.equal(compactionOutcomes.length, 1);
    assert.equal(compactionOutcomes[0].reason, control.includes("overflow") ? "overflow" : "threshold");
    assert.equal(compactionOutcomes[0].willRetry, false);
    assert.equal(Boolean(compactionOutcomes[0].aborted), control.endsWith("cancelled"));
    assert.equal(pendingRecovery().length, 0, "compaction failure is not a provider retry");
    if (compactionSuccessor) assert.equal(readFileSync(join(cwd, "resumed-proof.txt"), "utf8"), "resumed-proof.txt", "new user authorization survives an old summary failure");
    assert.equal(requests.length - before, compactionSuccessor ? 4 : control.includes("overflow") ? 1 : 2, "only explicit user authorization permits a successor checkpoint after failure");
    assert.equal(existsSync(join(cwd, "forbidden.txt")), false);
    assert.equal(parseGoalFile(resolve(cwd, primary.activePath)).status, compactionSuccessor === "pause-resume" ? "paused" : "active", "compaction failure preserves the user's lifecycle decision");
    if (compactionSuccessor) assert.equal(currentGoal().status, "paused", "the authorized successor reaches its deliberate stop");
    assert.equal(parseGoalFile(resolve(cwd, primary.activePath)).taskList.tasks[0].status, "pending");
    settings.setCompactionEnabled(false);
    responses = [];
    await session.prompt("/goal-pause");
  } else if (recovery) {
    const error = {failure: {stopReason: control === "aborted" ? "aborted" : "error", errorMessage: control === "nontransient" ? "401 Authentication failed" : "503 Service Unavailable"}};
    responses = [[error]];
    await delay(100); await settled();
    assert.equal(requests.length - before, 1);
    assert.equal(parseGoalFile(resolve(cwd, primary.activePath)).taskList.tasks[0].status, "pending", "failure cannot complete a task");
    if (control === "nontransient") {
      assert.equal(pendingRecovery().length, 0);
      assert(!notices.some(notice => notice.includes("Provider network error")));
    } else {
      assert.equal(pendingRecovery().length, 1);
      assert.equal(recoveryTimers[0].milliseconds, 5000);
      if (["pause", "unfocus", "switch", "reopen", "new-session"].includes(control)) {
        const count = requests.length;
        const oldCheckpoint = structuredClone(checkpoints.at(-1));
        const checkpointCount = checkpoints.length;
        if (control === "reopen") responses = [[write("reopened-proof.txt"), pause]];
        await stop();
        assert.equal(pendingRecovery().length, 0, "user control cancels backoff");
        await delay(100);
        assert.equal(requests.length, count + (control === "reopen" ? 2 : 0), "reopened work and its final response belong to one fresh checkpoint");
        assert.equal(checkpoints.length, checkpointCount + (control === "reopen" ? 1 : 0));
        if (control === "reopen") {
          assert.notEqual(checkpoints.at(-1).details.runtimeId, oldCheckpoint.details.runtimeId);
          assert.equal(readFileSync(join(cwd, "reopened-proof.txt"), "utf8"), "reopened-proof.txt");
        }
        responses = [[write("forbidden.txt")]];
        await session.sendCustomMessage(oldCheckpoint, {triggerTurn: true});
        await settled();
        assert.equal(existsSync(join(cwd, "forbidden.txt")), false, "host-delivered stale recovery context cannot regain work authority");
        await session.sendCustomMessage(oldCheckpoint, {deliverAs: "nextTurn"});
      } else if (["cap", "unbounded"].includes(control)) {
        for (let attempt = 0; attempt < 3; attempt++) { responses = [[error]]; await advanceRecovery(); }
        assert.deepEqual(recoveryTimers.map(timer => timer.milliseconds), control === "cap" ? [5000, 10000, 10000] : [5000, 10000, 10000, 10000]);
        assert.equal(pendingRecovery().length, control === "cap" ? 0 : 1);
        assert.equal(notices.some(notice => notice.includes("after all recovery attempts")), control === "cap");
        if (control === "unbounded") assert(notices.some(notice => notice.includes("recovery 4, unbounded")));
      } else {
        responses = control === "success-reset" ? [[write("retry-proof.txt")], [], [error]] : [[write("retry-proof.txt"), pause]];
        await advanceRecovery();
        assert.equal(readFileSync(join(cwd, "retry-proof.txt"), "utf8"), "retry-proof.txt");
        if (control === "success-reset") {
          assert.deepEqual(recoveryTimers.map(timer => timer.milliseconds), [5000, 5000], "successful work resets the recovery ladder before the next outage");
          responses = [[write("second-retry-proof.txt"), pause]];
          await advanceRecovery();
          assert(existsSync(join(cwd, "second-retry-proof.txt")));
        }
      }
    }
    if (!["unfocus", "new-session"].includes(control)) await session.prompt("/goal-pause");
    assert.equal(pendingRecovery().length, 0);
    assert.equal(hostRetries, 0, "this extension recovery matrix disables immediate Pi retry; its separate native fixture covers that owner");
    responses = [];
  } else if (boundary === "idle") {
    const shellWork = {redirect: "echo progress > progress.txt", substitution: 'echo "$(echo progress > progress.txt)"', backtick: 'echo "`echo progress > progress.txt`"'}[control];
    responses = control === "inspect" ? Array.from({length: 3}, () => [{name: "get_goal", args: {}}])
      : control === "echo" ? [[{name: "bash", args: {command: "echo inspecting"}}]]
      : control === "ls" ? [[{name: "ls", args: {path: "."}}]]
      : control === "work" || shellWork ? [[shellWork ? {name: "bash", args: {command: shellWork}} : write("progress.txt")], [], [pause]] : [];
    const worked = control === "work" || Boolean(shellWork);
    const expectedResponses = control === "inspect" ? 4 : worked ? 3 : ["text", "clarify"].includes(control) ? 1 : 2;
    await delay(100);
    await settled();
    assert.equal(requests.length - before, expectedResponses, "only substantive work earns another automatic checkpoint; inspection remains allowed within the run");
    if (control === "ls") assert(results.some(result => result.toolName === "ls" && !result.isError), "inspection actually executed");
    if (control === "inspect") assert(requests.slice(before).every(request => JSON.stringify(request).includes("Do not call get_goal repeatedly")), "every inspection receives the existing soft guidance");
    assert.equal(parseGoalFile(resolve(cwd, primary.activePath)).status, worked ? "paused" : "active", "yielding for clarification does not mark the goal blocked or complete");
    if (control === "work") assert.equal(readFileSync(join(cwd, "progress.txt"), "utf8"), "progress.txt");
    if (shellWork) assert.equal(readFileSync(join(cwd, "progress.txt"), "utf8"), "progress\n");
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
      {name: "get_goal", args: {}},
      ...(control === "echo-quoted" ? ['echo "inspection; still inspection"', "echo 'inspection > still inspection'", 'echo inspection\\;still', "echo '$(inspection) `still inspection`'", 'echo inspection # no > work', 'echo "inspection\\"; still inspection"'] : [control === "echo-variable" ? 'echo "$PWD"' : "echo inspecting"]).map(command => ({name: "bash", args: {command}})),
      {name: "ls", args: {path: "."}}, block,
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
    assert(!notices.some(notice => notice.includes("Provider network error")), "successful host retry leaves no extension backoff");
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
  else if (boundary === "completion" || (auditOutcome && !completionWriteFailure && (reviewReopen || auditSkipped || control.startsWith("approved"))) || clearUnpaid || (["unfocus", "clear", "new-session"].includes(control) && boundary !== "agent")) assert.equal(focused, null);
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
  for (const timer of recoveryTimers) originalClearTimeout(timer.handle);
  globalThis.setTimeout = originalTimeout; globalThis.clearTimeout = originalClearTimeout;
  Date.now = originalNow;
  fs.renameSync = originalRename;
  fs.appendFileSync = originalAppend;
  fs.unlinkSync = originalUnlink;
  fs.copyFileSync = originalCopy;
  syncBuiltinESMExports();
  clearTimeout(deadline);
  await session?.abort();
  await host?.dispose();
  if (reviewing) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  rmSync(work, {recursive: true, force: true});
}
