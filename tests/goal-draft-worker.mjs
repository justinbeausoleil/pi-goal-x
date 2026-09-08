/** S1/S2 draft lifecycle through the real loader, public tools and session tree. */
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { AssistantMessageEventStream } from "@earendil-works/pi-ai";
import { createAgentSession, createAgentSessionRuntime, DefaultResourceLoader, ModelRuntime, SessionManager, SettingsManager } from "@earendil-works/pi-coding-agent";

const scenario = process.argv[2] ?? "cancel";
const mode = process.argv[3] ?? "goal";
const work = mkdtempSync(join(tmpdir(), "goal-draft-native-"));
const cwd = join(work, "project"), agentDir = join(work, "agent");
mkdirSync(cwd); mkdirSync(agentDir);
writeFileSync(join(cwd, "reference.txt"), "Read-only drafting reference.");
process.env.PI_OFFLINE = "1";
process.env.PI_CODING_AGENT_DIR = agentDir;
process.env.PI_GOAL_GLOBAL_SETTINGS_FILE = join(agentDir, "goal-settings.json");
process.env.PI_GOAL_AUTO_CONFIRM = "0";
const settings = SettingsManager.inMemory({ compaction: { enabled: false, reserveTokens: 16384, keepRecentTokens: 100 }, retry: { enabled: false } });
const model = { id: "synthetic", name: "Synthetic", provider: "openai", api: "openai-completions", baseUrl: "http://127.0.0.1:1", reasoning: false, input: ["text"], contextWindow: 65536, maxTokens: 8192, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } };
const results = [], errors = [], dialogs = [], notices = [];
let session, host, steps = [], requests = 0, summaries = 0, decision = "Continue", replacement = "Replace", auditor = "Disabled", duringDialog, duringDialogTitle = "Confirm", afterTool, shutdownFiles, settingsChoices = [], providerFailure;
const objective = label => `1) Discuss ${label}. Done when the requirements are agreed.\n2) Implement ${label}. Done when its tests pass.`;
const proposal = (selectedMode, label) => ({ name: "propose_goal_draft", args: { objective: objective(label), sisyphus: selectedMode === "sisyphus", auto_continue: false } });
const latestDraft = () => session.sessionManager.getBranch().findLast(e => e.type === "custom" && e.customType === "pi-goal-draft");
const files = () => {
  const dir = join(cwd, ".pi", "goals");
  try { return readdirSync(dir).filter(n => n.startsWith("active_goal_")).map(n => [n, readFileSync(join(dir, n), "utf8")]); }
  catch { return []; }
};
async function open(manager, sessionStartEvent) {
  const loader = new DefaultResourceLoader({ cwd, agentDir, settingsManager: settings, noSkills: true, noPromptTemplates: true, noThemes: true, noContextFiles: true,
    systemPrompt: "Discuss the synthetic fixture without starting unconfirmed goal work.",
    additionalExtensionPaths: [fileURLToPath(new URL("../extensions/goal.ts", import.meta.url))],
    extensionFactories: [pi => {
      pi.on("tool_result", async event => { results.push(event); if (afterTool) await afterTool(event); });
      // Observe the outgoing host settlement before the fork runtime exists.
      pi.on("session_shutdown", () => { shutdownFiles = files(); });
    }],
  });
  await loader.reload({ resolveProjectTrust: async () => true });
  assert.deepEqual(loader.getExtensions().errors, []);
  const runtime = await ModelRuntime.create({ authPath: join(agentDir, "auth.json"), modelsPath: null, allowModelNetwork: false, refreshOnCreate: false });
  await runtime.setRuntimeApiKey("openai", "synthetic-unused");
  const created = await createAgentSession({ cwd, agentDir, modelRuntime: runtime, model, thinkingLevel: "off", resourceLoader: loader, sessionManager: manager, settingsManager: settings, sessionStartEvent });
  session = created.session;
  await session.bindExtensions({ mode: "rpc", onError: error => errors.push(error), uiContext: {
    notify(message) { notices.push(message); }, setStatus() {}, setWidget() {}, setEditorText() {}, onTerminalInput: () => () => {},
    input: async () => "Fixture custom answer", confirm: async () => false,
    select: async (title, choices) => {
      dialogs.push({ title, choices });
      if (title === "Goal settings" || /^(disableTasks|disableContracts) \(/.test(title)) {
        const label = settingsChoices.shift();
        const selected = choices.find(choice => choice.trim().startsWith(label));
        assert(selected, "scripted public settings choice exists");
        return selected;
      }
      if (title.startsWith(duringDialogTitle) && duringDialog) { const action = duringDialog; duringDialog = undefined; await action(); }
      const label = title.startsWith("Completion auditor") ? auditor : title.includes("already active") ? replacement : title.startsWith("Confirm") ? decision : "1.";
      return choices.find(choice => choice.includes(label)) ?? choices[0];
    },
  } });
  session.agent.streamFunction = (requestedModel, context) => {
    const summary = !context.tools?.length;
    if (summary) summaries++;
    else assert(++requests <= 100, "bounded draft fixture");
    const step = summary ? undefined : steps.shift();
    if (step?.args.path === "cancelled-work.txt" || step?.contextIncludes) {
      const content = context.messages.at(-1)?.content;
      const projection = typeof content === "string" ? content : (content ?? []).map(c => c.text ?? "").join("\n");
      try {
        if (step.args.path === "cancelled-work.txt") {
          assert.match(projection, /DISCUSSION|DRAFT/);
          assert.doesNotMatch(projection, /Use work tools directly/);
        }
        for (const required of step.contextIncludes ?? []) assert(projection.includes(required), `current projection includes ${required}`);
      } catch (error) { providerFailure = error; }
    }
    const args = step ? { ...step.args } : undefined;
    if (args?.expected_work_revision === "$current") args.expected_work_revision = results.findLast(r => r.details?.work_revision)?.details.work_revision;
    const content = step ? [{ type: "toolCall", id: `draft-${requests}`, name: step.name, arguments: args }]
      : [{ type: "text", text: summary ? "Unconfirmed discussion remains. No goal or implementation has been approved." : "Discussion awaits the user." }];
    const value = { role: "assistant", api: requestedModel.api, provider: requestedModel.provider, model: requestedModel.id, content,
      usage: { input: 100, output: 10, cacheRead: 0, cacheWrite: 0, totalTokens: 110, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } }, stopReason: step ? "toolUse" : "stop", timestamp: Date.now() };
    const stream = new AssistantMessageEventStream();
    stream.push({ type: "start", partial: value }); stream.push({ type: "done", reason: value.stopReason, message: value }); return stream;
  };
  return { ...created, services: { cwd, agentDir, modelRuntime: runtime, settingsManager: settings, resourceLoader: loader, diagnostics: [] }, diagnostics: [] };
}
async function run(prompt, nextSteps) {
  steps = [...nextSteps];
  let settled, timeout;
  const done = new Promise((resolve, reject) => { settled = resolve; timeout = setTimeout(() => reject(new Error("Draft fixture did not settle")), 8000); });
  const unsubscribe = session.subscribe(event => { if (event.type === "agent_settled" && steps.length === 0) settled(); });
  try { await session.prompt(prompt); await done; if (providerFailure) throw providerFailure; assert.deepEqual(errors, []); }
  finally { clearTimeout(timeout); unsubscribe(); }
}
async function reopen() {
  const file = session.sessionManager.getSessionFile();
  assert.equal((await host.switchSession(file)).cancelled, false);
}
async function checkProposal(selectedMode, label) {
  const before = dialogs.length;
  await run("Review the selected branch's proposal.", [proposal(selectedMode, label)]);
  assert(dialogs.length > before, "selected branch draft reaches its own confirmation dialog");
  assert.match(results.at(-1).content.map(c => c.text ?? "").join(""), /refinement requested/);
  assert.equal(latestDraft().data.mode, selectedMode);
}
try {
  host = await createAgentSessionRuntime(({ sessionManager, sessionStartEvent }) => open(sessionManager, sessionStartEvent), { cwd, agentDir, sessionManager: SessionManager.create(cwd, join(work, "sessions")) });
  await run(`/${mode} First discussion`, [
    { name: "read", args: { path: "reference.txt" } },
    { name: "goal_question", args: { question: "Which format?", options: ["CSV", "JSON"], allow_custom: false } },
    { name: "goal_questionnaire", args: { questions: [{ id: "output", question: "Output?", options: ["Report", "Chart"], allow_custom: false }] } },
    proposal(mode, "First discussion"),
  ]);
  assert.equal(latestDraft().data.auditorEnabled, false, "per-draft auditor choice survives refinement");
  assert.deepEqual(files(), [], "discussion creates no approved goal");
  if (scenario === "scope") {
    decision = "Confirm";
    const contract = "Verify the exact output 🧭 é 漢字.\n".repeat(180);
    const evidence = "The independently inspected output matched 🧭 é 漢字.\n".repeat(180).trim();
    const proposed = proposal(mode, "Retained scope");
    proposed.args.tasks = [
      { id: "proof", title: "Verify the feature", verification_contract: contract.trim() },
      { id: "later", title: "Verify the next feature", verification_contract: "The second test passes." },
    ];
    await run("Confirm the complete requirements.", [proposed]);
    assert.equal(results.at(-1).details.goal.retainedScope?.objective, objective("Retained scope"), "creation persists approved scope");
    await run("Record completed evidence and start the remaining task.", [{ name: "update_goal_task", args: { expected_work_revision: "$current", updates: [
      { task_id: "proof", status: "complete", evidence }, { task_id: "later", status: "start" },
    ] } }]);
    const completed = results.at(-1).details.goal.retainedScope.tasks.proof;
    assert.equal(completed.status, "complete");
    assert.equal(completed.evidence, evidence);
    assert.equal(typeof completed.completedAt, "string");
    let expectedScope = JSON.parse(JSON.stringify(results.at(-1).details.goal.retainedScope));
    await reopen();
    let cursor, firstCursor, full = "", revision;
    do {
      await run("Retrieve all retained requirements.", [{ name: "get_goal", args: { section: "scope", ...(cursor ? { cursor } : {}) } }]);
      const page = results.at(-1).details.page;
      assert.equal(page.section, "scope");
      assert(page.content.length <= 4000);
      assert.equal(Buffer.from(page.content).toString("utf8"), page.content);
      assert.equal(page.contentRevision, revision ?? page.contentRevision);
      revision = page.contentRevision;
      full += page.content;
      cursor = page.nextCursor;
      firstCursor ??= cursor;
    } while (cursor);
    assert.deepEqual(JSON.parse(full), expectedScope, "scope and full evidence survive actual reopen and lossless paging");
    assert.equal(JSON.parse(full).tasks.proof.verificationContract, contract.trim());
    await run("Skip a planning step without waiving its contract.", [{ name: "update_goal_task", args: { expected_work_revision: "$current", task_id: "later", status: "skipped", reason: "The user changed the schedule; required evidence remains outstanding." } }]);
    expectedScope = JSON.parse(JSON.stringify(results.at(-1).details.goal.retainedScope));
    assert.equal(expectedScope.tasks.later.status, "skipped");
    await run("Reject a cursor bound to earlier retained progress.", [{ name: "get_goal", args: { section: "scope", cursor: firstCursor } }]);
    assert.equal(results.at(-1).details.page, undefined);
    assert.match(results.at(-1).content.map(c => c.text ?? "").join(""), /Invalid or stale cursor.*Restart/s);
    await run("Attempt completion after skipping the required task.", [{ name: "update_goal", args: { status: "complete" } }]);
    assert.equal(results.at(-1).details.goal.status, "active", "skipping does not waive a contract");
    process.env.PI_GOAL_AUTO_CONFIRM = "1";
    await run("Remove the planning nodes, retaining their requirements.", [{ name: "set_goal_tasks", args: { mode: "replace", expected_work_revision: "$current", tasks: [{ id: "optional", title: "Optional planning note" }] } }]);
    assert.deepEqual(results.at(-1).details.goal.taskList.tasks.map(t => t.id), ["optional"], "structural deletion is allowed without waiving retained scope");
    assert.deepEqual(JSON.parse(JSON.stringify(results.at(-1).details.goal.retainedScope)), expectedScope, "removed proof and pending obligation are retained");
    settingsChoices = ["disableTasks:", "Set project override to true", "disableContracts:", "Set project override to true", "Done"];
    await session.prompt("/goal-settings");
    assert.deepEqual(settingsChoices, []);
    assert(!session.getActiveToolNames().includes("set_goal_tasks"));
    await run("Attempt completion after removing the plan.", [{ name: "update_goal", args: { status: "complete" } }]);
    assert.equal(results.at(-1).details.goal.status, "active");
    assert.match(results.at(-1).content.map(c => c.text ?? "").join(""), /later.*recreate|recreate.*later/is);
    await reopen();
    await run("Inspect retained requirements after deletion and reopen.", [{ name: "get_goal", args: {} }]);
    assert.deepEqual(JSON.parse(JSON.stringify(results.at(-1).details.goal.retainedScope)), expectedScope);
    settingsChoices = ["disableTasks:", "Set project override to false", "Done"];
    await session.prompt("/goal-settings");
    await run("Reject a weaker contract hidden behind a recreated ID.", [{ name: "set_goal_tasks", args: { mode: "upsert", expected_work_revision: "$current", tasks: [{ ...proposed.args.tasks[1], verification_contract: "A weaker assertion." }] } }]);
    assert(!results.at(-1).details.goal.taskList.tasks.some(t => t.id === "later"), "recreation cannot change a retained contract without human scope approval");
    await run("Recreate the unresolved task with its original ID and contract.", [{ name: "set_goal_tasks", args: { mode: "upsert", expected_work_revision: "$current", tasks: [proposed.args.tasks[1]] } }]);
    for (const batch of [false, true]) {
      const update = { task_id: "later", status: "complete" };
      await run("Attempt completion without required evidence while contracts are hidden.", [{ name: "update_goal_task", args: { expected_work_revision: "$current", ...(batch ? {updates: [update]} : update) } }]);
      assert.equal(results.at(-1).details.goal.taskList.tasks.find(t => t.id === "later").status, "pending", "settings cannot bypass retained task evidence");
    }
    await run("Supply the retained evidence through the existing task tool.", [{ name: "update_goal_task", args: { expected_work_revision: "$current", task_id: "later", status: "complete", evidence: "The second test passes, as independently observed." } }]);
    assert.equal(results.at(-1).details.goal.retainedScope.tasks.later.status, "complete");
    assert.equal(results.at(-1).details.goal.retainedScope.tasks.proof.evidence, evidence, "recreation preserves the other removed task's proof");
    await run("Add a later contract with an arbitrary valid stable ID.", [{ name: "set_goal_tasks", args: { mode: "upsert", expected_work_revision: "$current", tasks: [{ id: "__proto__", title: "Later requirement", verification_contract: "This later requirement also remains owed." }] } }]);
    assert(Object.hasOwn(results.at(-1).details.goal.retainedScope.tasks, "__proto__"));
    assert.equal(results.at(-1).details.goal.retainedScope.tasks.__proto__.verificationContract, "This later requirement also remains owed.");
  } else if (scenario === "cancel") {
    decision = "Cancel";
    await run("Cancel this proposal, retaining the discussion.", [proposal(mode, "First discussion")]);
    assert(session.getActiveToolNames().includes("propose_goal_draft"), "proposal cancellation must retain the draft");
    assert.equal(latestDraft().data.clearedAt, undefined, "proposal cancellation must not tombstone the draft");
    decision = "Continue";
    await session.compact(); assert(summaries > 0, "native compaction invokes the summarizer");
    await reopen();
    await checkProposal(mode, "After compaction and reopen");
    await session.prompt("/goal-cancel");
    assert(latestDraft().data.clearedAt, "explicit cancellation writes a tombstone");
    await reopen();
    assert(!session.getActiveToolNames().includes("propose_goal_draft"), "cancelled draft stays cancelled after reopen");
    assert.deepEqual(files(), []);
  } else if (scenario === "branches") {
    const firstLeaf = session.sessionManager.getLeafId();
    const secondMode = mode === "goal" ? "sisyphus" : "goal";
    await run(`/${secondMode} Second discussion`, [
      { name: "goal_questionnaire", args: { questions: [{ id: "branch", question: "Second branch only?", options: ["Unique second answer"], allow_custom: false }] } },
      proposal(secondMode, "Second discussion"),
    ]);
    const secondLeaf = session.sessionManager.getLeafId();
    await session.navigateTree(firstLeaf);
    await checkProposal(mode, "First branch restored");
    await session.prompt("/goal-cancel");
    const cancelledLeaf = session.sessionManager.getLeafId();
    await session.navigateTree(secondLeaf);
    await checkProposal(secondMode, "Second branch restored");
    await session.navigateTree(cancelledLeaf);
    assert(!session.getActiveToolNames().includes("propose_goal_draft"), "selected branch tombstone wins over other live draft");
    await session.navigateTree(secondLeaf);
    await reopen();
    await checkProposal(secondMode, "Second branch after reopen");
    decision = "Confirm";
    await run("Confirm only this selected discussion.", [proposal(secondMode, "Second branch after reopen")]);
    const confirmedText = results.at(-1).content.map(c => c.text ?? "").join("");
    assert.match(confirmedText, /Second branch only\?.*Unique second answer/s, "selected branch's questionnaire answers survive reopen");
    assert.doesNotMatch(confirmedText, /Output\?/, "other branch's questionnaire answers do not leak");
    await run("Inspect the confirmed goal.", [{ name: "get_goal", args: {} }]);
    assert.equal(results.at(-1).details.goal.sisyphus, secondMode === "sisyphus");
    assert.match(results.at(-1).details.goal.objective, /Second branch after reopen/);
    assert.equal(results.at(-1).details.goal.skipAuditor, true);
  } else if (["paused-refine", "blocked-refine"].includes(scenario)) {
    decision = "Confirm";
    await run("Confirm this goal before discussing a revision.", [proposal(mode, "Existing stopped goal")]);
    const status = scenario.split("-")[0];
    const reason = "Dependency unavailable: fresh stopped-state context.";
    const suggested = "Restore the missing local fixture.";
    await run("Record the concrete stop.", [{ name: "update_goal", args: { status, reason, suggested_action: suggested } }]);
    assert.equal(results.at(-1).details.goal.status, status);
    decision = "Continue";
    const proposed = proposal(mode, "Possible change while stopped");
    proposed.contextIncludes = [reason, ...(status === "paused" ? [suggested] : [])];
    await run("/goal-tweak Discuss the dependency before revising the goal", [proposed]);
    assert.equal(results.at(-1).details.goal.status, status, "refinement preserves the stopped lifecycle");
    assert.equal(session.sessionManager.getBranch().filter(e => e.customType === "pi-goal-event").length, 0);
  } else if (scenario === "fork" || scenario === "fork-tweak") {
    if (scenario === "fork-tweak") {
      decision = "Confirm";
      await run("Confirm this goal before discussing a revision.", [proposal(mode, "Existing approved goal")]);
      decision = "Continue";
      await run("/goal-tweak Discuss a possible revision", [proposal(mode, "Possible revision")]);
      assert.equal(latestDraft().data.mode, "tweak");
    }
    const before = files();
    const oldId = session.sessionId;
    assert.equal((await host.fork(session.sessionManager.getLeafId(), { position: "at" })).cancelled, false);
    assert.notEqual(session.sessionId, oldId, "real host created a distinct forked session");
    if (scenario === "fork") await checkProposal(mode, "Inherited discussion only");
    else {
      assert(!session.getActiveToolNames().includes("propose_goal_draft"), "fork invalidates a detached tweak");
      assert(latestDraft().data.clearedAt, "detached tweak receives a branch-local tombstone");
      const focus = session.sessionManager.getBranch().findLast(e => e.type === "custom" && e.customType === "pi-goal-focus");
      assert.equal(focus.data.focusedGoalId, null, "fork explicitly detaches autonomous execution authority");
    }
    assert.equal(shutdownFiles.length, before.length);
    assert.deepEqual(files(), shutdownFiles, "fork changes no approved goal files after outgoing settlement");
  } else if (["active-refine", "active-cancel", "active-settings"].includes(scenario)) {
    decision = "Confirm";
    afterTool = async event => {
      if (event.toolName !== "propose_goal_draft" || !event.details.goal) return;
      afterTool = undefined;
      decision = "Continue";
      if (scenario === "active-cancel") duringDialog = () => session.prompt("/goal-cancel");
      await session.prompt("/goal-tweak Discuss a possible change before continuing work");
    };
    const approved = proposal(mode, "Existing active goal");
    approved.args.auto_continue = true;
    await run("Confirm, then immediately discuss a possible revision.", [approved, proposal(mode, "Possible change"),
      ...(scenario === "active-cancel" ? [{ name: "write", args: { path: "cancelled-work.txt", content: "Unauthorized drafting continuation" } }] : []),
    ]);
    if (scenario === "active-cancel") {
      assert.equal(existsSync(join(cwd, "cancelled-work.txt")), false, "cancelled drafting run must not dispatch a new write before settlement");
      const rejected = session.messages.findLast(m => m.role === "toolResult" && m.toolName === "write");
      assert.equal(rejected?.isError, true, "host reports the blocked dispatch");
    }
    if (scenario === "active-settings") {
      settingsChoices = ["disableTasks:", "Set project override to true", "Done"];
      await session.prompt("/goal-settings");
      assert.deepEqual(settingsChoices, [], "public settings menu completed");
      assert(!notices.some(n => /Settings change failed/.test(n)), JSON.stringify(notices));
      assert.deepEqual(errors, []);
      assert(session.getActiveToolNames().includes("propose_goal_draft"), "settings refresh preserves the live drafting profile before compaction");
      await session.compact();
    }
    await delay(150); // Three native continuation retry intervals.
    assert.equal(session.sessionManager.getBranch().filter(e => e.customType === "pi-goal-event").length, 0, "active drafting must not dispatch autonomous goal checkpoints");
    assert.equal(latestDraft().data.mode, "tweak");
    if (scenario === "active-settings") assert(session.getActiveToolNames().includes("propose_goal_draft"), "settings refresh preserves the live drafting profile");
    if (scenario === "active-cancel") {
      assert(latestDraft().data.clearedAt, "explicit cancellation persists its tombstone");
      await run("Inspect the unchanged approved goal.", [{ name: "get_goal", args: {} }]);
      assert.equal(results.at(-1).details.goal.status, "active");
      assert.equal(results.at(-1).details.goal.objective, approved.args.objective);
      await session.compact();
      await delay(150);
      assert.equal(session.sessionManager.getBranch().filter(e => e.customType === "pi-goal-event").length, 0, "cancelled drafting remains stopped after compaction");
      await run("Write ordinary.txt with the word authorized; this is an unrelated user request.", [{ name: "write", args: { path: "ordinary.txt", content: "authorized" } }]);
      assert.equal(readFileSync(join(cwd, "ordinary.txt"), "utf8"), "authorized", "a fresh ordinary user request can still use normal tools");
      await run("/goal-resume", [{ name: "update_goal", args: { status: "paused", reason: "Explicit resume verified." } }]);
      assert.equal(results.at(-1).details.goal.status, "paused", "explicit resume permits a fresh execution response: " + JSON.stringify(results.at(-1)));
      assert.equal(session.sessionManager.getBranch().filter(e => e.customType === "pi-goal-event").length, 1, "explicit resume dispatches once");
    }
  } else if (scenario === "selector-stale") {
    const firstDraft = latestDraft();
    const before = requests;
    duringDialogTitle = "A ";
    duringDialog = () => session.navigateTree(firstDraft.id);
    await session.prompt(`/${mode === "goal" ? "sisyphus" : "goal"} Rejected replacement`);
    assert.equal(requests, before, "stale replacement decision starts no discussion request");
    assert.equal(latestDraft().data.mode, firstDraft.data.mode);
    assert.equal(latestDraft().data.seed, firstDraft.data.seed);
  } else if (["stale", "stale-question", "stale-questionnaire"].includes(scenario)) {
    decision = "Confirm";
    if (scenario !== "stale") duringDialogTitle = "Race question?";
    duringDialog = () => session.prompt("/goal-cancel");
    const question = { question: "Race question?", options: ["Old answer"], allow_custom: false };
    const step = scenario === "stale" ? proposal(mode, "Cancelled during confirmation")
      : scenario === "stale-question" ? { name: "goal_question", args: question }
      : { name: "goal_questionnaire", args: { questions: [{ id: "old", ...question }] } };
    await run("Answer a dialog while cancelling its draft separately.", [step]);
    assert.deepEqual(files(), [], "returning confirmation must not resurrect a cancelled draft");
    assert.match(results.at(-1).content.map(c => c.text ?? "").join(""), /stale|changed|cancelled/i);
    assert(latestDraft().data.clearedAt);
    assert(!session.getActiveToolNames().includes("propose_goal_draft"));
  } else throw new Error(`Unknown scenario ${scenario}`);
  assert.deepEqual(results.filter(r => r.isError), []);
  assert(!results.some(r => ["write", "edit", "bash"].includes(r.toolName) && r.input?.path !== "ordinary.txt"), "no unconfirmed implementation work");
  console.log(JSON.stringify({ passed: true, scenario, mode, requests, summaries, dialogs: dialogs.length }));
} finally {
  if (session) await session.abort();
  if (host) await host.dispose();
  else session?.dispose();
  rmSync(work, { recursive: true, force: true });
}
