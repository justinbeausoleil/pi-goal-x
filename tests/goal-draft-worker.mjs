/** S1/S2 draft lifecycle through the real loader, public tools and session tree. */
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
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
const warnings = [], warn = console.warn;
console.warn = (...args) => { warnings.push(args.join(" ")); warn(...args); };
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
        for (const required of step.contextIncludes ?? []) assert(projection.includes(required), `current projection includes ${required}; received ${projection.slice(0, 1500)}`);
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
  if (scenario.startsWith("scope-external")) {
    const kind = scenario.slice("scope-external".length + 1) || "objective";
    decision = "Confirm";
    const proposed = proposal(mode, "Approved external-edit fixture");
    proposed.args.auto_continue = true;
    proposed.args.objective += "\nVerification contract: Verify the original exact result.";
    proposed.args.tasks = [{id: "proof", title: "Original task", verification_contract: "Verify the original task output."}];
    await run("Confirm the original requirements.", [proposed]);
    await run("Record original proof.", [{name: "update_goal_task", args: {expected_work_revision: "$current", task_id: "proof", status: "complete", evidence: "Original proof remains required."}}]);
    await session.prompt("/goal-pause");
    await session.prompt("/goal-resume");
    await run("Inspect the explicitly resumed goal before external editing.", [{name: "get_goal", args: {}}]);
    assert.equal(results.at(-1).details.goal.status, "active", "fresh scope reads must preserve explicit resume persistence");
    const approved = JSON.parse(JSON.stringify(results.at(-1).details.goal));
    const file = join(cwd, approved.activePath);
    const changedObjective = kind === "objective" ? objective("Edited body awaiting human review") : approved.objective;
    const original = readFileSync(file, "utf8"), boundary = original.indexOf("\n\n# Goal Prompt");
    const metadata = JSON.parse(original.slice(0, boundary));
    metadata.autoContinue = true;
    const editedContract = "Externally proposed verification requirement.";
    if (kind === "goal-contract") metadata.verificationContract = editedContract;
    if (kind === "task-contract") metadata.taskList.tasks[0].verificationContract = editedContract;
    if (kind === "task-title") metadata.taskList.tasks[0].title = "Externally retitled task";
    if (kind === "new-task") metadata.taskList.tasks.push({id: "later", title: "Externally added requirement", verificationContract: editedContract, status: "pending"});
    const edited = (JSON.stringify(metadata, null, 2) + original.slice(boundary)).replace(`# Goal Prompt\n\n${approved.objective}`, `# Goal Prompt\n\n${changedObjective}`);
    assert(edited.includes(`# Goal Prompt\n\n${changedObjective}`));
    writeFileSync(file, edited); // User edits the public goal body; retained metadata is unchanged.
    const requestsBeforeReload = requests;
    await reopen();
    await delay(150);
    assert.equal(requests, requestsBeforeReload, "cold reopen must detect file edits before starting an automatic request");
    await session.prompt("/goal-refresh");
    assert(readFileSync(file, "utf8").includes(`# Goal Prompt\n\n${changedObjective}`), "refresh must preserve the externally edited body for review");
    await run("Inspect the pending external proposal.", [{name: "get_goal", args: {}, contextIncludes: ["SCOPE REVIEW", approved.objective]}]);
    const pending = results.at(-1).details.goal;
    assert.match(results.at(-1).content.map(c => c.text ?? "").join(""), /Scope review required/);
    assert.equal(pending.objective, changedObjective, "edited body remains readable");
    assert.deepEqual(JSON.parse(JSON.stringify(pending.retainedScope)), approved.retainedScope, "external text does not become approved scope");
    assert.equal(pending.autoContinue, true, "the pending scope gate suppresses an otherwise eligible active goal");
    const requestsBeforeWait = requests;
    await delay(150);
    assert.equal(requests, requestsBeforeWait, "pending scope must not queue automatic executor requests");
    await reopen();
    await delay(150);
    assert.equal(requests, requestsBeforeWait, "reopening a pending proposal must not queue an executor request");
    await session.compact();
    assert(summaries > 0, "the pending proposal passes through native compaction");
    await run("Inspect the pending proposal after reopen and compaction.", [{name: "get_goal", args: {verbose: true}, contextIncludes: ["SCOPE REVIEW", approved.objective]}]);
    assert.match(results.at(-1).content.map(c => c.text ?? "").join(""), /Scope review required/);
    assert.deepEqual(JSON.parse(JSON.stringify(results.at(-1).details.goal.retainedScope)), approved.retainedScope);
    const heldFile = readFileSync(file, "utf8"), heldBoundary = heldFile.indexOf("\n\n# Goal Prompt");
    const heldMetadata = JSON.parse(heldFile.slice(0, heldBoundary));
    heldMetadata.autoContinue = false; // User returns the fixture to manual stepping for the confirmation checks.
    writeFileSync(file, JSON.stringify(heldMetadata, null, 2) + heldFile.slice(heldBoundary));
    assert(readFileSync(file, "utf8").includes(`# Goal Prompt\n\n${changedObjective}`), "accounting preserves the edited body");
    process.env.PI_GOAL_AUTO_CONFIRM = "1";
    await run("Attempt to overwrite the unreviewed external task proposal through ordinary structural confirmation.", [{name: "set_goal_tasks", args: {mode: "replace", expected_work_revision: "$current", tasks: proposed.args.tasks}}]);
    assert.match(results.at(-1).content.map(c => c.text ?? "").join(""), /scope review required/i);
    assert.deepEqual(JSON.parse(JSON.stringify(results.at(-1).details.goal.taskList.tasks)), JSON.parse(JSON.stringify(pending.taskList.tasks)), "ordinary tools preserve the edited proposal until human scope confirmation");
    process.env.PI_GOAL_AUTO_CONFIRM = "0";
    await run("Attempt completion without accepting the external proposal.", [{name: "update_goal", args: {status: "complete"}}]);
    assert.equal(results.at(-1).details.goal.status, "active");
    assert.match(results.at(-1).content.map(c => c.text ?? "").join(""), /scope.*human|human.*scope/i);
    decision = "Cancel";
    const revision = proposal(mode, kind === "objective" ? "Edited body awaiting human review" : "Approved external-edit fixture");
    if (kind === "goal-contract") revision.args.verification_contract = editedContract;
    if (kind.startsWith("task-") || kind === "new-task") revision.args.tasks = metadata.taskList.tasks.map(t => ({id: t.id, title: t.title, verification_contract: t.verificationContract}));
    await run("/goal-tweak Adopt the reviewed external objective.", [revision]);
    assert.equal(results.at(-1).details.goal.retainedScope.objective, approved.objective);
    decision = "Confirm";
    if (kind === "objective") {
      duringDialog = async () => {
        const current = readFileSync(file, "utf8");
        writeFileSync(file, current.replace(`# Goal Prompt\n\n${changedObjective}`, "# Goal Prompt\n\nA newer external proposal arrived during confirmation."));
      };
      await run("A file edit arrives while the human is reviewing the prior proposal.", [revision]);
      assert.match(results.at(-1).content.map(c => c.text ?? "").join(""), /changed|stale|cancelled/i);
      assert.equal(results.at(-1).details.goal.retainedScope.objective, approved.objective);
      assert(readFileSync(file, "utf8").includes("A newer external proposal arrived during confirmation."));
    }
    await run("Confirm the exact external objective.", [revision]);
    assert.equal(results.at(-1).details.goal.retainedScope.objective, changedObjective);
    if (kind.startsWith("task-")) {
      assert.equal(results.at(-1).details.goal.taskList.tasks[0].status, "pending", "external requirement revisions must invalidate the original completion");
      assert.equal(results.at(-1).details.goal.taskList.tasks[0].evidence, undefined);
      assert.equal(results.at(-1).details.goal.taskList.tasks[0].completedAt, undefined);
    }
    if (kind === "goal-contract") assert.equal(results.at(-1).details.goal.retainedScope.verificationContract, editedContract);
    if (kind === "new-task") assert.equal(results.at(-1).details.goal.retainedScope.tasks.later.verificationContract, editedContract);
    await reopen();
    await run("Inspect the accepted external proposal receipt.", [{name: "get_goal", args: {}}]);
    assert.equal(results.at(-1).details.goal.retainedScope.changes.at(-1).reason, "Adopt the reviewed external objective.");
  } else if (scenario === "scope-tweak") {
    decision = "Confirm";
    const proposed = proposal(mode, "Original approved objective");
    proposed.args.objective += "\nVerification contract: Keep the exact approved output.";
    proposed.args.tasks = Array.from({length: 200}, (_, i) => ({id: `step-${i + 1}`, title: `Original task ${i + 1}`, verification_contract: `Original requirement ${i + 1}: verify its output.`}));
    await run("Confirm the 200-node goal.", [proposed]);
    await run("Record evidence for the first two requirements.", [{name: "update_goal_task", args: {expected_work_revision: "$current", updates: [
      {task_id: "step-1", status: "complete", evidence: "Original first proof."}, {task_id: "step-2", status: "complete", evidence: "Unaffected second proof."},
    ]}}]);
    const originalScope = JSON.parse(JSON.stringify(results.at(-1).details.goal.retainedScope));
    const changed = proposal(mode, "Human reviewed objective");
    changed.args.objective += "\nVerification contract: Verify the revised output.";
    changed.args.tasks = proposed.args.tasks.slice(0, 199).map((task, i) => i ? task : {...task, title: "Revised first task", verification_contract: "Revised first requirement."});
    process.env.PI_GOAL_AUTO_CONFIRM = "1";
    decision = "Cancel";
    const dialogCount = dialogs.length;
    await run("/goal-tweak Revise the first requirement and remove the last requirement.", [changed]);
    assert(dialogs.length > dialogCount, "auto-confirm cannot bypass the human scope decision");
    assert.deepEqual(JSON.parse(JSON.stringify(results.at(-1).details.goal.retainedScope)), originalScope, "cancel leaves all approved requirements and evidence intact");
    decision = "Confirm";
    await run("Confirm exactly this revised scope.", [changed]);
    const revised = results.at(-1).details.goal;
    assert.equal(revised.retainedScope.objective, objective("Human reviewed objective"));
    assert.equal(revised.retainedScope.verificationContract, "Verify the revised output.");
    assert.equal(revised.taskList.tasks.length, 199);
    assert.equal(revised.taskList.tasks[0].status, "pending", "changed completed requirements reopen");
    assert.equal(revised.taskList.tasks[0].evidence, undefined);
    assert.equal(revised.taskList.tasks[0].completedAt, undefined);
    assert.equal(revised.taskList.tasks[1].evidence, "Unaffected second proof.");
    assert.equal(revised.retainedScope.tasks["step-200"], undefined, "only the confirmed revision waives the removed requirement");
    const receipt = revised.retainedScope.changes.at(-1);
    assert(receipt.priorText.includes("Original requirement 200"));
    assert(receipt.priorText.includes("Original first proof."), "historical evidence survives reopening in the receipt");
    assert(receipt.newText.includes("Revised first requirement."));
    assert.equal(receipt.reason, "Revise the first requirement and remove the last requirement.");
    assert(receipt.confirmationLocator && receipt.confirmedAt);
    const shown = dialogs.findLast(d => d.title.startsWith("Confirm")).title;
    assert(shown.includes("Original requirement 200"), "complete before requirements reach native UI");
    assert(shown.includes("Revised first requirement."), "complete after requirements reach native UI");
    const expectedScope = JSON.parse(JSON.stringify(revised.retainedScope));
    await reopen();
    await run("Inspect the accepted receipt after reopening.", [{name: "get_goal", args: {}}]);
    assert.deepEqual(JSON.parse(JSON.stringify(results.at(-1).details.goal.retainedScope)), expectedScope);
    await run("Reopen only the completed task whose title changes through upsert.", [{name: "set_goal_tasks", args: {mode: "upsert", expected_work_revision: "$current", tasks: [{id: "step-2", title: "Second task retitled"}]}}]);
    assert.equal(results.at(-1).details.goal.taskList.tasks[1].status, "pending");
    assert.equal(results.at(-1).details.goal.taskList.tasks[1].evidence, undefined);
    await run("Supply fresh evidence in task order.", [{name: "update_goal_task", args: {expected_work_revision: "$current", updates: [
      {task_id: "step-1", status: "complete", evidence: "Revised first proof."}, {task_id: "step-2", status: "complete", evidence: "Retitled second proof."},
    ]}}]);
    const replace = results.at(-1).details.goal.taskList.tasks.map(t => ({id: t.id, title: t.id === "step-2" ? "Second task retitled again" : t.title, verification_contract: t.verificationContract}));
    await run("Reopen through full replacement while preserving the unaffected proof.", [{name: "set_goal_tasks", args: {mode: "replace", expected_work_revision: "$current", tasks: replace}}]);
    const replaced = results.at(-1).details.goal;
    assert.equal(replaced.taskList.tasks[0].evidence, "Revised first proof.");
    assert.equal(replaced.taskList.tasks[1].status, "pending");
    assert.equal(replaced.taskList.tasks[1].evidence, undefined);
    assert.equal(replaced.taskList.tasks[1].completedAt, undefined);
    settingsChoices = ["disableTasks:", "Set project override to true", "disableContracts:", "Set project override to true", "Done"];
    await session.prompt("/goal-settings");
    const withoutPlan = proposal(mode, "Human reviewed objective");
    withoutPlan.args.verification_contract = null;
    decision = "Cancel";
    await run("/goal-tweak Remove only the goal-level verification contract.", [withoutPlan]);
    assert.equal(results.at(-1).details.goal.retainedScope.verificationContract, "Verify the revised output.");
    const ledger = join(cwd, ".pi", "goals", "goal_events.jsonl");
    renameSync(ledger, `${ledger}.saved`); mkdirSync(ledger); // Fault injection at the ledger append boundary.
    decision = "Confirm";
    await run("Confirm the goal contract removal while retaining every task.", [withoutPlan]);
    const accepted = JSON.parse(JSON.stringify(results.at(-1).details.goal));
    assert.equal(accepted.retainedScope.verificationContract, undefined);
    assert.equal(accepted.retainedScope.changes.length, 2);
    assert.deepEqual(accepted.taskList.tasks, JSON.parse(JSON.stringify(replaced.taskList.tasks)), "omitted plan and disabled settings retain every task and proof");
    assert(warnings.some(n => /ledger diagnostic.*goal_tweaked/i.test(n)), "ledger failure is reported after accepting the scope receipt");
    rmSync(ledger, {recursive: true}); renameSync(`${ledger}.saved`, ledger);
    await reopen();
    await run("Verify the receipt survives the failed ledger append and reopen.", [{name: "get_goal", args: {}}]);
    assert.deepEqual(JSON.parse(JSON.stringify(results.at(-1).details.goal.retainedScope)), accepted.retainedScope);
  } else if (scenario === "scope") {
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
