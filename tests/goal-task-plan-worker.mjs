/** S1/S2: build and reopen a 200-node plan exclusively through public tools. */
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { AssistantMessageEventStream } from "@earendil-works/pi-ai";
import { createAgentSession, DefaultResourceLoader, ModelRuntime, SessionManager, SettingsManager } from "@earendil-works/pi-coding-agent";

const work = mkdtempSync(join(tmpdir(), "goal-task-plan-"));
const cwd = join(work, "project"), agentDir = join(work, "agent");
mkdirSync(cwd); mkdirSync(agentDir); mkdirSync(join(cwd, ".pi"));
process.env.PI_OFFLINE = "1";
process.env.PI_CODING_AGENT_DIR = agentDir;
process.env.PI_GOAL_GLOBAL_SETTINGS_FILE = join(agentDir, "goal-settings.json");
process.env.PI_GOAL_AUTO_CONFIRM = "1";
writeFileSync(join(cwd, ".pi/pi-goal-x-settings.json"), JSON.stringify({ disabled: true }));
const settings = SettingsManager.inMemory({ compaction: { enabled: false }, retry: { enabled: false } });
const model = { id: "synthetic", name: "Synthetic", provider: "openai", api: "openai-completions", baseUrl: "http://127.0.0.1:1", reasoning: false, input: ["text"], contextWindow: 65536, maxTokens: 8192, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } };
const errors = [], results = [];
const concurrentAccounting = process.argv.includes("--concurrent-accounting");
const details = process.argv.includes("--details");
const longField = details ? " début 🧭 é 漢字\n".repeat(500) + "end-of-full-field" : "";
const taskEvidence = "evidence.txt contains independent proof" + longField;
const objective = "Preserve 200 public tasks, their structure and completion evidence through reopen." + longField;
let clock = Date.now(), accountingUsage, history = "";
if (concurrentAccounting) Date.now = () => clock;
let session, failure, deadline, requests = 0, completedTask, lastGoal, firstRevision, resolveFinished;
const finished = new Promise(resolve => { resolveFinished = resolve; });
const tasks = (start, count) => Array.from({ length: count }, (_, i) => ({ id: `t${start + i}`, title: `Task ${start + i}`, verification_contract: `Preserve evidence for task ${start + i}.${start + i === 142 ? longField : ""}` }));
const steps = [
  ...[[1, 50], [51, 50], [101, 50], [151, 30]].map(([start, count]) => ({ name: "set_goal_tasks", args: { mode: "upsert", tasks: tasks(start, count), block_completion: true }, count: start + count - 1 })),
  { name: "write", args: { path: "evidence.txt", content: "independent proof" } },
  { name: "update_goal_task", args: { updates: [{ task_id: "t1", status: "complete", evidence: taskEvidence }, { task_id: "t175", status: "start" }] }, completed: true },
  { name: "set_goal_tasks", args: { mode: "upsert", tasks: [{ id: "t2", title: "Atomic edit" }, { id: "new" }] }, reject: /non-empty title/ },
  { name: "set_goal_tasks", args: { mode: "upsert", tasks: tasks(181, 20) }, count: 200 },
  { name: "set_goal_tasks", args: { mode: "upsert", tasks: [{ id: "t175", title: "Current task revised", parent_id: "t170" }] }, count: 200, moved: true },
  { name: "set_goal_tasks", args: { mode: "upsert", tasks: [{ id: "t177", parent_id: "t170" }, { id: "t176", parent_id: "t170" }] }, check: goal => {
    assert.deepEqual(goal.taskList.tasks.find(t => t.id === "t170").subtasks.map(t => t.id), ["t175", "t177", "t176"]);
  } },
  { name: "set_goal_tasks", args: { mode: "upsert", tasks: [{ id: "t177", title: "Revised sibling" }] }, check: goal => {
    assert.deepEqual(goal.taskList.tasks.find(t => t.id === "t170").subtasks.map(t => t.id), ["t175", "t177", "t176"], "ordinary edits retain sibling order");
  } },
  ...[
    [{ mode: "upsert", tasks: tasks(201, 1) }, /200/],
    [{ mode: "replace", tasks: tasks(1, 201) }, /200/],
    [{ mode: "upsert", tasks: tasks(1, 51) }, /50/],
    [{ mode: "upsert", tasks: [{ id: "t2", title: "Atomic edit" }, { id: " t2 " }] }, /Duplicate/],
    [{ mode: "upsert", tasks: [{ id: " " }] }, /non-empty id/],
    [{ mode: "upsert", tasks: [{ id: "t2", parent_id: "missing" }] }, /missing parent/],
    [{ mode: "upsert", tasks: [{ id: "t170", parent_id: "t175" }] }, /Cyclic/],
    [{ mode: "upsert", tasks: [{ id: "t2", parent_id: "t175" }] }, /depth/i],
    [{ mode: "upsert", tasks: [{ id: "t2", lightweight_subtasks: true }] }, /no subtasks/],
    [{ mode: "upsert", tasks: [{ id: "t2", title: "Atomic edit" }, { id: "t3", title: " " }] }, /non-empty title/],
    [{ mode: "upsert", tasks: [{ id: "t1", verification_contract: "Weaker proof" }] }, /scope revision/],
    [{ mode: "upsert", tasks: [{ id: "t1", verification_contract: "" }] }, /scope revision/],
  ].map(([args, reject]) => ({ name: "set_goal_tasks", args, reject })),
  { name: "update_goal_task", args: { updates: [{ task_id: "t2", status: "complete", evidence: "valid member" }, { task_id: "missing", status: "start" }] }, reject: /not found/ },
  { name: "set_goal_tasks", args: { mode: "upsert", tasks: [{ id: "t2", title: "Stale edit" }] }, staleRevision: true, reject: /expected_work_revision/ },
  { name: "update_goal_task", args: { task_id: "t2", status: "start" }, withoutRevision: true, reject: /expected_work_revision/ },
  { name: "set_goal_tasks", args: { mode: "upsert", tasks: [{ id: "t175", parent_id: null }] }, check: goal => {
    assert.equal(goal.taskList.tasks.at(-1).id, "t175", "moving to root appends after existing roots");
    assert.equal(goal.taskList.tasks.at(-1).title, "Current task revised");
    assert.equal(goal.currentTaskId, "t175");
    assert.deepEqual(goal.taskList.tasks.find(t => t.id === "t170").subtasks.map(t => t.id), ["t177", "t176"]);
  } },
  { name: "set_goal_tasks", args: { mode: "replace", tasks: tasks(1, 200), block_completion: true }, count: 200, check: goal => {
    assert.deepEqual(goal.taskList.tasks.map(t => t.id), Array.from({ length: 200 }, (_, i) => `t${i + 1}`), "full replacement specifies all 200 roots and their ordering");
    assert.equal(goal.currentTaskId, "t175");
  } },
  { name: "get_goal", args: { verbose: true }, final: true },
  ...(details ? [
    { name: "get_goal", args: { section: "objective" }, detail: true },
    { name: "get_goal", args: { section: "tasks" }, detail: true },
    { name: "get_goal", args: { section: "tasks", task_id: "t142" }, detail: true },
    { name: "get_goal", args: { section: "tasks", cursor: "not-a-valid-cursor" }, rejectPage: true },
    { name: "get_goal", args: { section: "tasks", task_id: "t142" }, cursorFrom: "t142", malformedCursor: true, rejectPage: true },
    { name: "get_goal", args: { section: "tasks", task_id: "t143" }, cursorFrom: "t142", rejectPage: true },
    { name: "get_goal", args: { section: "tasks", task_id: "missing" }, cursorFrom: "t142", rejectPage: true },
    { name: "get_goal", args: { section: "objective", task_id: "t142" }, cursorFrom: "t142", rejectPage: true },
    { name: "get_goal", args: { section: "tasks", cursor: "" }, rejectPage: true },
    { name: "get_goal", args: { section: "history" }, cursorFrom: "tasks", rejectPage: true },
    { name: "set_goal_tasks", args: { mode: "upsert", tasks: [{ id: "t142", title: "Changed selected content" }] } },
    { name: "get_goal", args: { section: "tasks", task_id: "t142" }, cursorFrom: "t142", rejectPage: true },
  ] : []),
  ...(concurrentAccounting ? [{ name: "get_goal", args: { section: "history" } }] : []),
  { name: "update_goal", args: { status: "paused", reason: "Public plan is ready for reopening." } },
];
let inFlight;
const detailContent = new Map(), detailCursors = new Map(), contentRevisions = new Map();
async function accountOtherSession() {
  const loader = new DefaultResourceLoader({ cwd, agentDir, settingsManager: settings, noSkills: true, noPromptTemplates: true, noThemes: true, noContextFiles: true, systemPrompt: "Report briefly.", additionalExtensionPaths: [process.env.PI_GOAL_TEST_EXTENSION ?? fileURLToPath(new URL("../extensions/goal.ts", import.meta.url))] });
  await loader.reload({ resolveProjectTrust: async () => true });
  assert.deepEqual(loader.getExtensions().errors, []);
  const runtime = await ModelRuntime.create({ authPath: join(agentDir, "auth.json"), modelsPath: null, allowModelNetwork: false, refreshOnCreate: false });
  await runtime.setRuntimeApiKey("openai", "synthetic-unused");
  const { session: other } = await createAgentSession({ cwd, agentDir, modelRuntime: runtime, model, thinkingLevel: "off", resourceLoader: loader, sessionManager: SessionManager.open(session.sessionManager.getSessionFile()), settingsManager: settings });
  await other.bindExtensions({ onError: error => errors.push(error) });
  other.agent.streamFunction = requestedModel => {
    clock += 2000;
    const value = { role: "assistant", api: requestedModel.api, provider: requestedModel.provider, model: requestedModel.id, content: [{ type: "text", text: "Accounting-only response." }], usage: { input: 10, output: 1, cacheRead: 0, cacheWrite: 0, totalTokens: 11, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } }, stopReason: "stop", timestamp: Date.now() };
    const stream = new AssistantMessageEventStream(); stream.push({ type: "start", partial: value }); stream.push({ type: "done", reason: "stop", message: value }); return stream;
  };
  try { await other.prompt("Respond briefly without changing any goal or task."); }
  finally { await other.abort(); other.dispose(); }
}
async function record(event) {
  results.push(event);
  try {
    assert.equal(event.isError, false, JSON.stringify(event));
    const step = inFlight;
    assert.equal(event.toolName, step.name);
    if (["set_goal_tasks", "update_goal_task", "get_goal"].includes(step.name)) {
      assert.equal(typeof event.details.work_revision, "string", "public results must expose work_revision");
      const goal = event.details.goal;
      firstRevision ??= event.details.work_revision;
      if (step.rejectPage) {
        assert.equal(event.details.page, undefined);
        assert.match(event.content.map(c => c.text ?? "").join(""), /Invalid or stale cursor.*Restart/s);
        return;
      }
      if (step.detail) {
        const page = event.details.page, key = step.args.task_id ?? step.args.section;
        assert.equal(page.goalId, goal.id, "page identifies its goal");
        assert.equal(page.section, step.args.section);
        assert.equal(page.taskId, step.args.task_id);
        assert.match(page.contentRevision, /^[a-f0-9]{64}$/);
        assert.equal(page.contentRevision, contentRevisions.get(key) ?? page.contentRevision, "usage between reads does not change content revision");
        contentRevisions.set(key, page.contentRevision);
        assert.ok(page.content.length <= 4000);
        assert.equal(Buffer.from(page.content).toString("utf8"), page.content, "pages never split surrogate pairs");
        const text = (detailContent.get(key) ?? "") + page.content;
        detailContent.set(key, text);
        if (page.nextCursor) {
          if (!detailCursors.has(key)) detailCursors.set(key, page.nextCursor);
          steps.unshift({ ...step, args: { ...step.args, cursor: page.nextCursor } });
        } else {
          assert.equal(text.length, page.totalChars, "no overlap or gaps");
          if (key === "objective") assert.equal(text, objective);
          else {
            const rows = text.split("\n").map(line => JSON.parse(line));
            const expected = key === "tasks" ? tasks(1, 200) : tasks(142, 1);
            assert.deepEqual(rows.map(row => row.id), expected.map(task => task.id));
            for (const [i, row] of rows.entries()) {
              assert.equal(row.verificationContract, expected[i].verification_contract);
              if (row.id === "t1") assert.equal(row.evidence, taskEvidence);
            }
          }
        }
      }
      if (accountingUsage) {
        assert.equal(goal.usage.tokensUsed, accountingUsage.tokensUsed + 121, "both responses' 110 + 11 tokens are retained exactly once");
        assert.equal(goal.usage.activeSeconds, 8, "four main-session seconds plus two seconds in each concurrent response are retained");
        accountingUsage = undefined;
      }
      if (step.args.section === "history" && !step.rejectPage) {
        history += event.details.page.content;
        if (event.details.page.nextCursor) steps.unshift({ name: "get_goal", args: { section: "history", cursor: event.details.page.nextCursor } });
        else {
          const events = history.split("\n").map(line => JSON.parse(line));
          assert.equal(events.filter(e => e.type === "task_complete" && e.taskId === "t1").length, 1);
          assert.equal(events.filter(e => e.type === "task_started" && e.taskId === "t175").length, 1);
        }
      }
      if (completedTask) assert.equal(goal.taskList.tasks[0].status, "complete", "another session's accounting must not discard successful completion");
      if (step.reject) {
        assert.match(event.content.map(c => c.text ?? "").join(""), step.reject);
        assert.deepEqual(JSON.parse(JSON.stringify(goal.taskList)), lastGoal.taskList, "rejected operation commits no member");
        assert.equal(goal.currentTaskId, lastGoal.currentTaskId);
      }
      if (step.count) assert.equal(flatten(goal.taskList.tasks).length, step.count, "incremental calls retain all prior tasks");
      if (step.completed) {
        completedTask = JSON.parse(JSON.stringify(goal.taskList.tasks[0]));
        assert.equal(completedTask.status, "complete");
        assert.equal(completedTask.evidence, taskEvidence);
        assert.equal(goal.currentTaskId, "t175");
      }
      if (completedTask) assert.deepEqual(JSON.parse(JSON.stringify(goal.taskList.tasks[0])), completedTask, "append/edit preserves completion evidence and timestamp");
      if (step.moved) {
        const parent = goal.taskList.tasks.find(t => t.id === "t170");
        assert.equal(parent.subtasks[0].id, "t175");
        assert.equal(parent.subtasks[0].title, "Current task revised");
        assert.equal(parent.subtasks[0].verificationContract, "Preserve evidence for task 175.");
        assert.equal(goal.currentTaskId, "t175");
        assert.equal(goal.taskList.blockCompletion, true, "omitted plan flag is retained by upsert");
      }
      step.check?.(goal);
      lastGoal = JSON.parse(JSON.stringify(goal));
    }
    if (step.completed && concurrentAccounting) { accountingUsage = { ...event.details.goal.usage }; await accountOtherSession(); }
  } catch (error) { failure = error; }
}
function flatten(tasks) { return tasks.flatMap(task => [task, ...flatten(task.subtasks ?? [])]); }
async function open(manager) {
  const loader = new DefaultResourceLoader({ cwd, agentDir, settingsManager: settings, noSkills: true, noPromptTemplates: true, noThemes: true, noContextFiles: true, systemPrompt: "Perform the authorized synthetic fixture.",
    additionalExtensionPaths: [process.env.PI_GOAL_TEST_EXTENSION ?? fileURLToPath(new URL("../extensions/goal.ts", import.meta.url))],
    extensionFactories: [pi => {
      pi.on("tool_result", record);
      // One accounting save before execution is adopted; another after the
      // successful result must be merged when the original turn flushes.
      pi.on("tool_call", async () => { if (concurrentAccounting && inFlight?.completed) await accountOtherSession(); });
    }],
  });
  await loader.reload({ resolveProjectTrust: async () => true });
  assert.deepEqual(loader.getExtensions().errors, []);
  const runtime = await ModelRuntime.create({ authPath: join(agentDir, "auth.json"), modelsPath: null, allowModelNetwork: false, refreshOnCreate: false });
  await runtime.setRuntimeApiKey("openai", "synthetic-unused");
  ({ session } = await createAgentSession({ cwd, agentDir, modelRuntime: runtime, model, thinkingLevel: "off", resourceLoader: loader, sessionManager: manager, settingsManager: settings }));
  await session.bindExtensions({ onError: error => { errors.push(error); } });
  session.subscribe(event => { if (event.type === "agent_settled" && (failure || !steps.length)) resolveFinished(); });
  session.agent.streamFunction = (requestedModel, context) => {
    requests++;
    if (inFlight && results.at(-1)?.toolCallId !== `call-${requests - 1}`) {
      const result = context.messages.findLast(m => m.role === "toolResult");
      failure ??= new Error(`The public tool did not execute: ${JSON.stringify(result)}`);
    }
    const step = failure ? undefined : steps.shift();
    inFlight = step;
    let content = [{ type: "text", text: "Fixture settled." }], stopReason = "stop";
    if (step) {
      const projection = context.messages.at(-1);
      const text = projection.content.map(c => c.text ?? "").join("");
      const revision = text.match(/work_revision: ([a-f0-9]+)/)?.[1];
      const args = { ...step.args };
      if (["set_goal_tasks", "update_goal_task"].includes(step.name) && revision) args.expected_work_revision = revision;
      if (step.staleRevision) args.expected_work_revision = firstRevision;
      if (step.withoutRevision) delete args.expected_work_revision;
      if (step.cursorFrom) args.cursor = detailCursors.get(step.cursorFrom);
      if (step.malformedCursor) args.cursor = `!${args.cursor}`;
      content = [{ type: "toolCall", id: `call-${requests}`, name: step.name, arguments: args }]; stopReason = "toolUse";
    }
    const value = { role: "assistant", api: requestedModel.api, provider: requestedModel.provider, model: requestedModel.id, content, usage: { input: 100, output: 10, cacheRead: 0, cacheWrite: 0, totalTokens: 110, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } }, stopReason, timestamp: Date.now() };
    const stream = new AssistantMessageEventStream(); stream.push({ type: "start", partial: value }); stream.push({ type: "done", reason: stopReason, message: value }); return stream;
  };
}
try {
  const manager = SessionManager.create(cwd, join(work, "sessions"));
  deadline = setTimeout(() => { failure ??= new Error("public plan fixture timed out"); void session?.abort(); resolveFinished(); }, 20000);
  await open(manager);
  await session.prompt(`/goal-direct ${objective}`);
  await finished;
  if (failure) throw failure;
  assert.equal(steps.length, 0);
  assert.equal(readFileSync(join(cwd, "evidence.txt"), "utf8"), "independent proof");
  const before = results.findLast(r => r.toolName === "get_goal").details;
  const sessionFile = manager.getSessionFile();
  await session.abort(); session.dispose();
  steps.push({ name: "get_goal", args: { verbose: true }, final: true });
  await open(SessionManager.open(sessionFile));
  await session.prompt("Inspect the preserved plan without resuming work.");
  if (failure) throw failure;
  const after = results.at(-1).details;
  assert.equal(after.goal.id, before.goal.id);
  assert.equal(after.goal.status, "paused");
  assert.deepEqual(JSON.parse(JSON.stringify(after.goal.taskList)), JSON.parse(JSON.stringify(before.goal.taskList)));
  assert.equal(after.goal.currentTaskId, "t175");
  assert.deepEqual(flatten(after.goal.taskList.tasks).map(t => t.id).sort(), tasks(1, 200).map(t => t.id).sort());
  if (details) {
    steps.push({ name: "create_goal", args: { objective: "A separate goal for cursor ownership checking." } }, { name: "get_goal", args: { section: "tasks" }, cursorFrom: "tasks", rejectPage: true });
    await session.prompt("Create the separate fixture goal and verify the first goal's cursor cannot read it.");
    await session.prompt("Inspect the second goal with the first goal's cursor.");
    if (failure) throw failure;
    assert.equal(steps.length, 0);
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, nodes: 200, requests, effects: results.filter(r => r.toolName === "write").length, reopened: true }));
} finally {
  clearTimeout(deadline); await session?.abort(); session?.dispose(); rmSync(work, { recursive: true, force: true });
}
