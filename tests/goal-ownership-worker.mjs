/** S1/S2 project progress and execution authority through native session boundaries. */
import assert from "node:assert/strict";
import fs from "node:fs";
import {syncBuiltinESMExports} from "node:module";
import {appendFileSync, chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, symlinkSync, writeFileSync} from "node:fs";
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
const results = [], errors = [], requests = [], notices = [], confirmations = [];
const warnings = [], originalWarn = console.warn;
console.warn = (...args) => { warnings.push(args.join(" ")); originalWarn(...args); };
let session, host, steps = [], earlyLeaf, failure, shutdownFile, summaries = 0, repairConfirmed = false, onRepairConfirm = async () => {};
const originalCopy = fs.copyFileSync;
let beforeBackup = () => {}, afterBackup = () => {};
fs.copyFileSync = (...args) => { beforeBackup(args[0]); const result = originalCopy(...args); afterBackup(args[0]); return result; };
syncBuiltinESMExports();
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
      pi.on("session_shutdown", () => { if (goalResult() && existsSync(join(cwd, goalResult().activePath))) shutdownFile = readGoal(); });
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
    confirm: async title => { confirmations.push(title); if (title.startsWith("Remove ")) { if (repairConfirmed) await onRepairConfirm(); return repairConfirmed; } return title === "Resume paused goal?" && scenario.endsWith("-confirm"); }, select: async () => undefined, input: async () => undefined,
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
  if (scenario.startsWith("child-")) {
    if (scenario === "child-nested") process.env.PI_SUBAGENT_DEPTH = "3";
    else process.env.PI_SUBAGENT_CHILD = "1";
    if (scenario === "child-fresh") await host.newSession();
    else if (["child-fork", "child-nested"].includes(scenario)) await host.fork(earlyLeaf, {position: "at"});
    else await host.switchSession(session.sessionManager.getSessionFile());
    const parentAfterShutdown = readGoal(), before = requests.length;
    const goalEntries = () => session.sessionManager.getBranch().filter(entry => entry.type === "custom" && entry.customType?.startsWith("pi-goal"));
    const entriesBefore = goalEntries();
    assert(!session.getActiveToolNames().some(name => /^(create_goal|get_goal|update_goal|set_goal_tasks|update_goal_task)$/.test(name)));
    await delay(100);
    assert.equal(requests.length, before, "delegated loading does not continue parent work");
    await run("Delegated assignment: inspect verified.txt only and keep this dedicated child instruction.", [{name: "read", args: {path: "verified.txt"}}]);
    const request = requests[before].context;
    assert.match(JSON.stringify(request.messages), /dedicated child instruction/);
    assert(!request.messages.some(message => ["pi-goal-context", "pi-goal-event", "pi-goal-audit-event"].includes(message.customType)));
    assert.doesNotMatch(request.systemPrompt ?? "", /PI GOAL ACTIVE|PI GOAL HELD/);
    assert.deepEqual(goalEntries(), entriesBefore, "child does not append parent control state");
    assert.equal(readGoal(), parentAfterShutdown, "child leaves parent progress and accounting untouched");
    assert.equal(readFileSync(join(cwd, "verified.txt"), "utf8"), "preserved-proof");
  } else if (["storage-resume", "storage-resume-confirm"].includes(scenario)) {
    const goals = join(cwd, ".pi", "goals"), ledger = join(goals, "goal_events.jsonl");
    const before = readGoal(), ledgerBefore = readFileSync(ledger, "utf8"), requestsBefore = requests.length;
    chmodSync(goals, 0o555);
    try {
      if (scenario.endsWith("-confirm")) await host.switchSession(session.sessionManager.getSessionFile());
      else await session.prompt("/goal-resume");
      await delay(100);
      assert.equal(readGoal(), before);
      assert.equal(readFileSync(ledger, "utf8"), ledgerBefore, "failed resume cannot append a success event");
      assert.equal(requests.length, requestsBefore, "failed resume cannot authorize continuation");
      assert.match(notices.at(-1), /failed|not.*saved|not.*resumed|storage/i);
      assert.deepEqual(errors, []);
    } finally { chmodSync(goals, 0o755); }
    await run("Inspect the failed resume without changing it.", [{name: "get_goal", args: {}}]);
    assert.equal(goalResult().status, "paused");
  } else if (["storage-write", "storage-lock", "storage-ledger", "storage-conflict"].includes(scenario)) {
    await session.prompt("/goal-resume");
    const goals = join(cwd, ".pi", "goals"), ledger = join(goals, "goal_events.jsonl"), lock = join(goals, ".locks", approved.id + ".lock");
    const before = readGoal(), ledgerBefore = readFileSync(ledger, "utf8"), warningCount = warnings.length;
    const staleRevision = results.findLast(r => r.details?.work_revision).details.work_revision;
    if (scenario === "storage-write") chmodSync(goals, 0o555);
    if (scenario === "storage-lock") writeFileSync(lock, JSON.stringify({pid: process.pid, startedAt: new Date().toISOString()}));
    if (scenario === "storage-ledger") { renameSync(ledger, join(work, "ledger-backup")); mkdirSync(ledger); }
    try {
      await run("Complete the remaining task through the public mutation tool.", [{name: "update_goal_task", args: {task_id: "remaining", status: "complete", expected_work_revision: "$current", evidence: "Fixture checked the remaining work."}}]);
      if (["storage-write", "storage-lock"].includes(scenario)) {
        assert.equal(readGoal(), before, "failed authoritative writes preserve exact project state");
        assert.equal(readFileSync(ledger, "utf8"), ledgerBefore, "failed state writes append no success events");
        const diagnostic = [...warnings.slice(warningCount), ...results.at(-1).content.map(c => c.text ?? "")].join("\n");
        assert.match(diagnostic, /denied|EACCES|lock|failed|write/i);
      } else if (scenario === "storage-ledger") {
        assert.match(warnings.slice(warningCount).join("\n"), /ledger diagnostic/);
        assert.match(readGoal(), /Fixture checked the remaining work/);
      } else {
        await run("Try a stale task mutation without replacing current progress.", [{name: "update_goal_task", args: {task_id: "remaining", status: "pending", expected_work_revision: staleRevision}}]);
        assert.match(results.at(-1).content.map(c => c.text ?? "").join("\n"), /stale.*expected_work_revision|current work_revision/i);
      }
    } finally {
      chmodSync(goals, 0o755);
      if (scenario === "storage-lock") rmSync(lock, {force: true});
      if (scenario === "storage-ledger") { rmSync(ledger, {recursive: true}); renameSync(join(work, "ledger-backup"), ledger); }
    }
    await session.prompt("/goal-pause");
    await run("Inspect the authoritative outcome after the fault is removed.", [{name: "get_goal", args: {}}]);
    const expected = scenario === "storage-write" ? "pending" : "complete";
    assert.equal(goalResult().taskList.tasks.find(task => task.id === "remaining").status, expected);
    await host.switchSession(session.sessionManager.getSessionFile());
    await run("Inspect the same outcome after native reopen.", [{name: "get_goal", args: {}}]);
    assert.equal(goalResult().taskList.tasks.find(task => task.id === "remaining").status, expected);
    assert.equal(goalResult().taskList.tasks.find(task => task.id === "verified").evidence, approved.taskList.tasks[0].evidence);
  } else if (scenario.startsWith("record-")) {
    const activeFile = join(cwd, approved.activePath), outside = join(work, "outside-user-file.md");
    const original = readGoal(), split = original.indexOf("\n\n# Goal Prompt"), metadata = JSON.parse(original.slice(0, split));
    writeFileSync(outside, "User-owned file outside goal storage");
    if (scenario === "record-corrupt") writeFileSync(activeFile, original.slice(0, 120));
    if (scenario === "record-symlink") {
      writeFileSync(outside, original);
      rmSync(activeFile);
      symlinkSync(outside, activeFile);
    }
    if (scenario === "record-path") {
      metadata.activePath = "../outside-user-file.md";
      metadata.archivedPath = "../outside-user-file.md";
      writeFileSync(activeFile, JSON.stringify(metadata) + original.slice(split));
    }
    if (scenario.startsWith("record-snapshot")) {
      const sessionFile = session.sessionManager.getSessionFile();
      if (scenario !== "record-snapshot") { await host.dispose(); host = undefined; session = undefined; }
      const snapshotPath = join(cwd, ".pi", ".goals-pool-snapshot.json");
      const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));
      if (scenario === "record-snapshot") snapshot.goals = [null];
      if (scenario === "record-snapshot-status") snapshot.goals[0].status = "invalid";
      if (scenario === "record-snapshot-task") snapshot.goals[0].taskList.tasks = [null];
      if (scenario === "record-snapshot-scope") snapshot.goals[0].retainedScope.tasks = null;
      if (scenario === "record-snapshot-path") snapshot.goals[0].activePath = "../outside-user-file.md";
      writeFileSync(snapshotPath, JSON.stringify(snapshot));
      if (scenario === "record-snapshot") await host.switchSession(sessionFile);
      else host = await createAgentSessionRuntime(({sessionManager, sessionStartEvent}) => open(sessionManager, sessionStartEvent), {cwd, agentDir, sessionManager: SessionManager.open(sessionFile), sessionStartEvent: {type: "session_start", reason: "resume"}});
    }
    const outsideBefore = readFileSync(outside, "utf8"), fileBefore = readFileSync(activeFile, "utf8");
    await session.prompt("/goal-refresh");
    await run("Inspect current progress after encountering an unsafe or corrupt record.", [{name: "get_goal", args: {}}]);
    if (["record-corrupt", "record-symlink"].includes(scenario)) {
      assert.equal(results.at(-1).details.goal, null, "invalid records cannot restore stale project authority");
      await session.prompt("/goal-recovery");
      assert.match(notices.at(-1), /malformed goal file/);
      assert.equal(readFileSync(activeFile, "utf8"), fileBefore, "diagnosis preserves invalid user content");
    } else {
      assert(results.at(-1).details.goal, "a valid goal remains focused after corrupt cache or unsafe path metadata");
      assert.equal(goalResult().taskList.tasks[0].evidence, approved.taskList.tasks[0].evidence);
      assert.equal(goalResult().activePath, approved.activePath);
      await run("Add an ordinary task through the safe authoritative record.", [{name: "set_goal_tasks", args: {mode: "upsert", expected_work_revision: "$current", tasks: [{id: "new-safe", title: "Safe pending task"}]}}]);
      assert.equal(results.at(-1).isError, false, JSON.stringify(results.at(-1).content));
      assert(goalResult().taskList.tasks.some(task => task.id === "new-safe"), JSON.stringify(results.at(-1).content));
      assert.equal(goalResult().taskList.tasks.find(task => task.id === "verified").evidence, approved.taskList.tasks[0].evidence);
    }
    assert.equal(readFileSync(outside, "utf8"), outsideBefore, "unsafe metadata and symlinks cannot overwrite unrelated files");
    assert.equal(readFileSync(join(cwd, "verified.txt"), "utf8"), "preserved-proof");
  } else if (scenario === "legacy-refresh") {
    const sessionFile = session.sessionManager.getSessionFile(), activeFile = join(cwd, approved.activePath);
    await host.dispose(); host = undefined; session = undefined;
    const content = readFileSync(activeFile, "utf8"), split = content.indexOf("\n\n# Goal Prompt");
    const legacy = JSON.parse(content.slice(0, split));
    delete legacy.retainedScope;
    legacy.version = 2;
    writeFileSync(activeFile, JSON.stringify(legacy, null, 2) + content.slice(split));
    rmSync(join(cwd, ".pi", ".goals-pool-snapshot.json"));
    const historical = structuredClone(legacy);
    historical.taskList.tasks[0].status = "pending";
    delete historical.taskList.tasks[0].evidence;
    const entries = readFileSync(sessionFile, "utf8").trim().split("\n").map(line => JSON.parse(line));
    for (const entry of entries) if (entry.customType === "pi-goal-focus") {
      entry.customType = "pi-goal-state";
      entry.data = {goal: historical};
    }
    writeFileSync(sessionFile, entries.map(entry => JSON.stringify(entry)).join("\n") + "\n");
    const before = requests.length;
    host = await createAgentSessionRuntime(({sessionManager, sessionStartEvent}) => open(sessionManager, sessionStartEvent), {cwd, agentDir, sessionManager: SessionManager.open(sessionFile), sessionStartEvent: {type: "session_start", reason: "resume"}});
    await delay(100);
    assert.equal(requests.length, before, "legacy paused focus does not schedule work");
    await run("Inspect the legacy goal without changing it.", [{name: "get_goal", args: {}}]);
    assert.equal(goalResult().id, approved.id);
    assert.equal(goalResult().taskList.tasks[0].evidence, approved.taskList.tasks[0].evidence, "current disk wins over legacy chat");
    const revised = "Legacy user-edited objective preserves verified task evidence.";
    const bodyBefore = readFileSync(activeFile, "utf8");
    writeFileSync(activeFile, bodyBefore.replace("# Goal Prompt\n\n" + legacy.objective, "# Goal Prompt\n\n" + revised));
    const editedFile = readFileSync(activeFile, "utf8");
    await session.prompt("/goal-refresh");
    assert.equal(readFileSync(activeFile, "utf8"), editedFile, "refresh does not rewrite legacy user content");
    assert.doesNotMatch(notices.at(-1), /no changes detected/, "refresh reports an actual legacy prompt edit");
    await run("Inspect the refreshed legacy objective.", [{name: "get_goal", args: {}}]);
    assert.equal(goalResult().objective, revised, "explicit refresh adopts the legacy user-edited prompt");
    assert.equal(goalResult().taskList.tasks[0].evidence, approved.taskList.tasks[0].evidence);
    await host.switchSession(sessionFile);
    await run("Inspect the legacy goal after another native reopen.", [{name: "get_goal", args: {}}]);
    assert.equal(goalResult().objective, revised);
    assert.equal(readFileSync(join(cwd, "verified.txt"), "utf8"), "preserved-proof");
  } else if (scenario.startsWith("recovery-")) {
    const goals = join(cwd, ".pi", "goals"), lock = join(goals, ".locks", "fixture.lock");
    const backupRoot = join(goals, ".recovery-backup"), snapshotPath = join(cwd, ".pi", ".goals-pool-snapshot.json");
    mkdirSync(join(goals, ".locks"), {recursive: true});
    const originalLock = JSON.stringify({pid: 999999999, startedAt: new Date(Date.now() - 300000).toISOString()});
    writeFileSync(lock, originalLock);
    const goalBefore = readGoal(), requestsBefore = requests.length;
    repairConfirmed = true;
    let liveLock;
    if (scenario === "recovery-lock-race") onRepairConfirm = async () => {
      liveLock = JSON.stringify({pid: process.pid, startedAt: new Date().toISOString()});
      writeFileSync(lock, liveLock);
    };
    if (["recovery-copy-race", "recovery-backup-race"].includes(scenario)) onRepairConfirm = async () => {
      liveLock = JSON.stringify({pid: process.pid, startedAt: new Date().toISOString()});
      const replace = source => { if (source === lock) writeFileSync(lock, liveLock); };
      if (scenario === "recovery-copy-race") beforeBackup = replace;
      else afterBackup = replace;
    };
    if (scenario === "recovery-session-stale") onRepairConfirm = async () => { await host.newSession(); };
    if (scenario === "recovery-backup-failure") writeFileSync(backupRoot, "User-owned backup path obstruction");
    if (scenario === "recovery-item-failure") onRepairConfirm = async () => { chmodSync(lock, 0); };
    if (["recovery-snapshot-failure", "recovery-scan-failure", "recovery-read-failure"].includes(scenario)) {
      rmSync(lock);
      const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));
      snapshot.goals.push({goalId: "missing-fixture", activePath: ".pi/goals/active_goal_missing-fixture.md"});
      writeFileSync(snapshotPath, JSON.stringify(snapshot));
      onRepairConfirm = async () => {
        if (scenario === "recovery-snapshot-failure") chmodSync(join(cwd, ".pi"), 0o555);
        else chmodSync(scenario === "recovery-scan-failure" ? goals : join(cwd, approved.activePath), scenario === "recovery-scan-failure" ? 0o300 : 0);
      };
    }
    const noticesBefore = notices.length;
    try {
      await session.prompt("/goal-recovery repair");
      assert.deepEqual(errors, [], "repair failures surface through the recovery command");
      if (scenario === "recovery-session-stale") {
        assert.equal(existsSync(backupRoot), false, "disposed-session confirmation cannot repair a replacement session");
        assert.equal(notices.length, noticesBefore, "no stale-context notification enters the replacement session");
      } else assert.match(notices.at(-1), /failed|changed|no longer stale/i, "repair must diagnose unsuccessful operations");
      if (!["recovery-snapshot-failure", "recovery-scan-failure", "recovery-read-failure"].includes(scenario)) {
        if (scenario === "recovery-item-failure") chmodSync(lock, 0o600);
        assert.equal(readFileSync(lock, "utf8"), liveLock ?? originalLock, "failed or obsolete repairs retain the lock");
      } else assert(JSON.parse(readFileSync(snapshotPath, "utf8")).goals.some(g => g.goalId === "missing-fixture"));
      chmodSync(join(cwd, approved.activePath), 0o600);
      assert.equal(readGoal(), scenario === "recovery-session-stale" ? shutdownFile : goalBefore, "repair preserves the settled authoritative goal");
      assert.equal(requests.length, requestsBefore);
    } finally {
      chmodSync(join(cwd, ".pi"), 0o755);
      chmodSync(goals, 0o755);
      chmodSync(join(cwd, approved.activePath), 0o600);
      if (existsSync(lock)) chmodSync(lock, 0o600);
    }
  } else if (scenario === "recovery") {
    const goals = join(cwd, ".pi", "goals"), locks = join(goals, ".locks");
    mkdirSync(locks, {recursive: true});
    const lock = join(locks, "fixture-stale.lock"), invalid = join(goals, "active_goal_invalid.md");
    const ledger = join(goals, "goal_events.jsonl"), snapshotPath = join(cwd, ".pi", ".goals-pool-snapshot.json");
    await session.prompt("/goal-recovery");
    writeFileSync(lock, JSON.stringify({pid: 999999999, startedAt: new Date(Date.now() - 300000).toISOString()}));
    writeFileSync(invalid, "Malformed user content must survive diagnosis and repair.");
    appendFileSync(ledger, "{invalid-ledger-line\n");
    const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));
    snapshot.goals.push({goalId: "missing-fixture", activePath: ".pi/goals/active_goal_missing-fixture.md"});
    writeFileSync(snapshotPath, JSON.stringify(snapshot));
    const originals = [lock, invalid, ledger, snapshotPath].map(file => readFileSync(file, "utf8"));
    const goalBefore = readGoal(), requestsBefore = requests.length;
    await session.prompt("/goal-status health");
    await session.prompt("/goal-recovery");
    const report = notices.at(-1);
    assert.match(report, /1 malformed goal file/);
    assert.match(report, /1 malformed ledger line/);
    assert.match(report, /1 stale lock/);
    assert.match(report, /1 orphaned snapshot entr/);
    assert.deepEqual([lock, invalid, ledger, snapshotPath].map(file => readFileSync(file, "utf8")), originals, "diagnosis is read-only");
    await session.prompt("/goal-recovery repair");
    assert.match(notices.at(-1), /cancelled/);
    assert.equal(existsSync(join(goals, ".recovery-backup")), false, "cancel does not create a backup");
    assert.deepEqual([lock, invalid, ledger, snapshotPath].map(file => readFileSync(file, "utf8")), originals);
    repairConfirmed = true;
    await session.prompt("/goal-recovery repair");
    assert.match(notices.at(-1), /2 operation\(s\) applied/);
    const backupRoot = join(goals, ".recovery-backup");
    const backup = join(backupRoot, readdirSync(backupRoot)[0]);
    assert.equal(readFileSync(join(backup, "lock-fixture-stale.lock"), "utf8"), originals[0]);
    assert.equal(readFileSync(join(backup, "pool-snapshot.json"), "utf8"), originals[3]);
    assert.equal(existsSync(lock), false);
    assert.equal(JSON.parse(readFileSync(snapshotPath, "utf8")).goals.some(g => g.goalId === "missing-fixture"), false);
    assert.equal(readFileSync(invalid, "utf8"), originals[1]);
    assert.equal(readFileSync(ledger, "utf8"), originals[2]);
    assert.equal(readGoal(), goalBefore, "repair leaves authoritative project progress unchanged");
    assert.equal(requests.length, requestsBefore, "recovery does not schedule goal work");
  } else if (scenario === "tree" || scenario === "fork") {
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
      for (const boundary of ["reopen", "reload"]) {
        const before = requests.length;
        steps = [{name: "write", args: {path: "unsolicited.txt", content: "Reopening a navigated branch is not resume"}}, pause];
        if (boundary === "reopen") await host.switchSession(session.sessionManager.getSessionFile());
        else await session.reload();
        await delay(150);
        assert.equal(existsSync(join(cwd, "unsolicited.txt")), false, `${boundary} cannot release the navigation hold`);
        assert.equal(requests.length, before);
        assert.equal(checkpoints(), boundaryCheckpoints);
      }
    }
    else assert.equal(results.at(-1).details.goal, null);
    steps = [pause];
    await session.prompt(scenario === "tree" ? "/goal-resume" : "/goal-focus");
    if (scenario === "tree") await host.switchSession(session.sessionManager.getSessionFile());
    await settled();
    assert.equal(checkpoints() - boundaryCheckpoints, 1, "explicit user action authorizes one checkpoint");
    assert.equal(goalResult().taskList.tasks[0].evidence, approved.taskList.tasks[0].evidence);
  } else if (scenario === "tree-paused-confirm") {
    await session.navigateTree(earlyLeaf);
    const before = requests.length, checkpointCount = checkpoints();
    steps = [pause];
    await host.switchSession(session.sessionManager.getSessionFile());
    await delay(150);
    assert(confirmations.includes("Resume paused goal?"));
    assert.equal(requests.length - before, 1, "the existing paused-resume confirmation releases a navigated branch");
    await settled();
    assert.equal(checkpoints() - checkpointCount, 1);
    assert.equal(session.sessionManager.getBranch().findLast(e => e.customType === "pi-goal-focus").data.reason, "resumed", "interactive resume persists release");
    assert.equal(goalResult().taskList.tasks[0].evidence, approved.taskList.tasks[0].evidence);
  } else if (["new", "new-auto", "missing-focus"].includes(scenario)) {
    if (scenario !== "new") writeFileSync(join(cwd, ".pi", "pi-goal-x-settings.json"), JSON.stringify({autoSelectSingleGoal: true}));
    await session.prompt("/goal-resume");
    if (scenario === "missing-focus") {
      await run("/goal-direct A goal whose saved focus will become unavailable.", [pause]);
      renameSync(join(cwd, goalResult().activePath), join(work, "removed-goal.md"));
    }
    const before = requests.length, priorSession = session.sessionId;
    steps = scenario === "new-auto" ? [pause] : [];
    if (scenario === "missing-focus") await host.switchSession(session.sessionManager.getSessionFile());
    else {
      assert.equal((await host.newSession()).cancelled, false);
      assert.notEqual(session.sessionId, priorSession, "actual host creates a distinct new session");
    }
    if (scenario === "new-auto") await settled();
    await delay(150);
    assert.equal(requests.length - before, scenario === "new-auto" ? 1 : 0, "new sessions require explicit auto-selection and a valid focus");
    await run("Inspect the new session's focus.", [{name: "get_goal", args: {}}]);
    if (scenario === "new-auto") {
      assert.equal(goalResult().id, approved.id);
      assert.equal(goalResult().taskList.tasks[0].evidence, approved.taskList.tasks[0].evidence);
      await session.prompt("/goal-unfocus");
      const nullEntry = session.sessionManager.getBranch().findLast(e => e.customType === "pi-goal-focus");
      assert.equal(nullEntry.data.focusedGoalId, null);
      const nullBefore = requests.length;
      await host.switchSession(session.sessionManager.getSessionFile());
      await delay(150);
      assert.equal(requests.length, nullBefore, "explicit null survives reopen despite auto-selection setting");
      await run("Inspect the explicitly detached session.", [{name: "get_goal", args: {}}]);
    }
    assert.equal(results.at(-1).details.goal, null, "default/null/missing focus cannot silently adopt another goal");
    assert.equal(readFileSync(join(cwd, "verified.txt"), "utf8"), "preserved-proof");
  } else if (/^(reopen|reload)-/.test(scenario)) {
    const status = scenario.split("-")[1];
    if (status === "active") await session.prompt("/goal-resume");
    if (status === "blocked") await run("/goal-resume", [{name: "update_goal", args: {status: "blocked", reason: "Dependency missing before session replacement."}}]);
    if (status === "budget_limited") await run("Create a separate goal with a one-token budget.", [{name: "create_goal", args: {objective: "Retain the exhausted budget through session replacement.", token_budget: 1}}]);
    const expectedId = goalResult().id;
    const before = requests.length, checkpointCount = checkpoints(), confirmationCount = confirmations.length;
    const continues = status === "active" || scenario.endsWith("-confirm");
    const priorSession = session.sessionId;
    steps = continues ? [pause] : [];
    if (scenario.startsWith("reload")) await session.reload();
    else assert.equal((await host.switchSession(session.sessionManager.getSessionFile())).cancelled, false);
    assert.equal(session.sessionId, priorSession, "same saved session retains its identity");
    if (continues) await settled();
    await delay(150);
    assert.equal(requests.length - before, continues ? 1 : 0, "only eligible active/restored goals continue, with no disposed-runtime duplicate");
    assert.equal(checkpoints() - checkpointCount, continues ? 1 : 0);
    assert.equal(confirmations.slice(confirmationCount).includes("Resume paused goal?"), scenario.startsWith("reopen-paused"), "only a paused reopen offers the existing resume choice");
    await run("Inspect the restored goal and current project progress.", [{name: "get_goal", args: {}}]);
    assert.equal(results.at(-1).details.goal.id, expectedId);
    assert.equal(goalResult().status, continues ? "paused" : status);
    if (status !== "budget_limited") assert.equal(goalResult().taskList.tasks[0].evidence, approved.taskList.tasks[0].evidence);
    else assert(goalResult().usage.tokensUsed >= goalResult().tokenBudget, "reopen retains exhausted usage");
  } else throw new Error(`Unknown ownership scenario ${scenario}`);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, scenario, requests: requests.length, summaries, checkpoints: checkpoints(), effects: results.filter(r => r.toolName === "write").length}));
} finally {
  console.warn = originalWarn;
  fs.copyFileSync = originalCopy;
  syncBuiltinESMExports();
  if (session) await session.abort();
  if (host) await host.dispose();
  rmSync(work, {recursive: true, force: true});
}
