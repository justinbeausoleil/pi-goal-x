/** S2: actual packed-package selection, legacy migration and byte-preserved rollback. */
import assert from "node:assert/strict";
import {cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, rmSync, writeFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {dirname, join, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {AssistantMessageEventStream} from "@earendil-works/pi-ai";
import {createAgentSession, createAgentSessionRuntime, DefaultResourceLoader, ModelRuntime, SessionManager, SettingsManager} from "@earendil-works/pi-coding-agent";

const [originalArtifact, forkArtifact, outputDirectory] = process.argv.slice(2).map(value => resolve(value));
assert(originalArtifact && forkArtifact && outputDirectory, "usage: node tests/package-rollback.mjs upstream.tgz fork.tgz evidence-directory");
mkdirSync(outputDirectory, {recursive: true});
const scratch = fileURLToPath(new URL("../../../scratch/", import.meta.url));
mkdirSync(scratch, {recursive: true});
const trial = mkdtempSync(join(scratch, "pi-goal-rollback-"));
const cwd = join(trial, "project"), agentDir = join(trial, "agent"), npmRoot = join(trial, "npm");
for (const directory of [cwd, agentDir, npmRoot]) mkdirSync(directory);
process.env.PI_OFFLINE = "1";
process.env.PI_CODING_AGENT_DIR = agentDir;
process.env.PI_GOAL_GLOBAL_SETTINGS_FILE = join(agentDir, "goal-settings.json");
process.env.PI_GOAL_AUTO_CONFIRM = "1";
process.env.PI_SUBAGENT_CHILD = "";
process.env.PI_SUBAGENT_DEPTH = "";
const pretrial = join(outputDirectory, "pretrial"), forkWritten = join(outputDirectory, "fork-written");
assert(!existsSync(pretrial) && !existsSync(forkWritten), "use a new evidence directory; earlier rollback evidence must survive");
const npm = resolve(dirname(process.execPath), "../lib/node_modules/npm/bin/npm-cli.js");
// The host npm CLI may be supplied when testing an independently downloaded Node.
const npmCli = process.env.PI_GOAL_TEST_NPM_CLI ?? npm;
writeFileSync(join(outputDirectory, "attempt.json"), JSON.stringify({node: process.version, originalArtifact, forkArtifact, npmCli, trial, pretrial, forkWritten}, null, 2) + "\n");
function install(artifact) {
  const log = execFileSync(process.execPath, [npmCli, "install", "--prefix", npmRoot, "--ignore-scripts", "--legacy-peer-deps", artifact], {encoding: "utf8"});
  writeFileSync(join(outputDirectory, artifact === originalArtifact ? "install-upstream.log" : "install-fork.log"), log);
}
function snapshot(directory, prefix = "") {
  return readdirSync(directory).sort().flatMap(name => {
    const file = join(directory, name), relative = join(prefix, name), stat = lstatSync(file);
    if (stat.isSymbolicLink()) return [[relative, "symlink", readlinkSync(file)]];
    if (stat.isDirectory()) return snapshot(file, relative);
    assert(stat.isFile(), "fixture contains only regular files/directories/symlinks");
    return [[relative, "file", createHash("sha256").update(readFileSync(file)).digest("hex")]];
  });
}
function restore() {
  rmSync(trial, {recursive: true, force: true});
  cpSync(pretrial, trial, {recursive: true, verbatimSymlinks: true});
}

const zeroUsage = {input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: {input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0}};
const model = {id: "synthetic", name: "Synthetic", provider: "openai", api: "openai-completions", baseUrl: "http://127.0.0.1:1", reasoning: false, input: ["text"], contextWindow: 65536, maxTokens: 8192, cost: zeroUsage.cost};
const results = [], errors = [];
let host, session, steps = [];
async function open(savedSession, expectedPackage) {
  host = await createAgentSessionRuntime(async ({sessionManager, sessionStartEvent}) => {
    const settingsManager = SettingsManager.create(cwd, agentDir);
    const resourceLoader = new DefaultResourceLoader({cwd, agentDir, settingsManager, noSkills: true, noPromptTemplates: true, noThemes: true, noContextFiles: true, systemPrompt: "Inspect the synthetic legacy trial only.",
      extensionFactories: [pi => pi.on("tool_result", event => results.push(event))]});
    await resourceLoader.reload({resolveProjectTrust: async () => true});
    const loaded = resourceLoader.getExtensions();
    assert.deepEqual(loaded.errors, []);
    const goals = loaded.extensions.filter(extension => extension.commands.has("goal"));
    assert.equal(goals.length, 1, "package settings select exactly one goal extension");
    assert(goals[0].path.startsWith(expectedPackage), "Pi resolves the selected installed package");
    assert(loaded.extensions.some(extension => extension.commands.has("unrelated-fixture")), "the other package remains enabled");
    const runtime = await ModelRuntime.create({authPath: join(agentDir, "auth.json"), modelsPath: null, allowModelNetwork: false, refreshOnCreate: false});
    await runtime.setRuntimeApiKey("openai", "synthetic-unused");
    const created = await createAgentSession({cwd, agentDir, modelRuntime: runtime, model, thinkingLevel: "off", resourceLoader, sessionManager, settingsManager, sessionStartEvent});
    session = created.session;
    await session.bindExtensions({onError: error => errors.push(error)});
    session.agent.streamFunction = () => {
      const step = steps.shift();
      if (step?.args.expected_work_revision === "$current") step.args.expected_work_revision = results.findLast(result => result.details?.work_revision)?.details.work_revision;
      const message = {role: "assistant", api: model.api, provider: model.provider, model: model.id, content: step ? [{type: "toolCall", id: `trial-${results.length}`, name: step.name, arguments: step.args}] : [{type: "text", text: "Trial inspection finished."}], usage: zeroUsage, stopReason: step ? "toolUse" : "stop", timestamp: Date.now()};
      const stream = new AssistantMessageEventStream();
      stream.push({type: "start", partial: message});
      stream.push({type: "done", reason: message.stopReason, message});
      return stream;
    };
    return {...created, services: {cwd, agentDir, modelRuntime: runtime, settingsManager, resourceLoader, diagnostics: []}, diagnostics: []};
  }, {cwd, agentDir, sessionManager: SessionManager.open(savedSession)});
}
async function run(nextSteps) {
  steps = nextSteps;
  const before = results.length;
  await session.prompt("Perform the explicitly requested synthetic package verification.");
  assert.deepEqual(errors, []);
  assert.equal(steps.length, 0);
  assert(!results.slice(before).some(result => result.isError));
  return results.at(-1);
}
async function close() { await host?.dispose(); host = undefined; session = undefined; }

try {
  install(originalArtifact);
  const originalPackage = join(npmRoot, "node_modules/pi-goal-x"), forkPackage = join(npmRoot, "node_modules/@justinbeausoleil/pi-goal-x");
  const unrelated = join(trial, "unrelated");
  mkdirSync(unrelated);
  writeFileSync(join(unrelated, "package.json"), JSON.stringify({name: "unrelated-fixture", version: "1.0.0", type: "module", pi: {extensions: ["extension.mjs"]}}));
  writeFileSync(join(unrelated, "extension.mjs"), 'export default pi => pi.registerCommand("unrelated-fixture", {description:"Preserved trial package",handler:async()=>{}});\n');
  writeFileSync(join(agentDir, "settings.json"), JSON.stringify({packages: [originalPackage, unrelated], theme: "dark", compaction: {enabled: false}, retry: {enabled: false}, trialSentinel: "preserve unrelated settings"}, null, 2));
  writeFileSync(process.env.PI_GOAL_GLOBAL_SETTINGS_FILE, JSON.stringify({disabled: true}));
  writeFileSync(join(cwd, "unrelated-user-data.txt"), "Preserve this independent project file exactly.\n");
  const raw = readFileSync(new URL("./fixtures/goals/active_goal_fixture.md", import.meta.url), "utf8");
  const split = raw.indexOf("\n\n# Goal Prompt"), legacy = {...JSON.parse(raw.slice(0, split)), version: 2, status: "paused", autoContinue: false};
  delete legacy.retainedScope;
  mkdirSync(join(cwd, ".pi/goals"), {recursive: true});
  writeFileSync(join(cwd, legacy.activePath), JSON.stringify(legacy, null, 2) + raw.slice(split));
  const manager = SessionManager.create(cwd, join(agentDir, "sessions"));
  manager.appendMessage({role: "assistant", api: model.api, provider: model.provider, model: model.id, content: [{type: "text", text: "Synthetic legacy conversation."}], usage: zeroUsage, stopReason: "stop", timestamp: 1});
  manager.appendCustomEntry("pi-goal-state", {goal: legacy});
  const savedSession = manager.getSessionFile();
  await open(savedSession, originalPackage);
  const original = (await run([{name: "get_goal", args: {}}])).details.goal;
  assert.equal(original.id, legacy.id);
  await close();
  cpSync(trial, pretrial, {recursive: true, verbatimSymlinks: true});
  const originalBytes = snapshot(trial);
  install(forkArtifact);
  SettingsManager.create(cwd, agentDir).setPackages([forkPackage, unrelated]);
  await open(savedSession, forkPackage);
  const reopened = (await run([{name: "get_goal", args: {}}])).details.goal;
  assert.equal(reopened.id, original.id);
  assert.deepEqual(JSON.parse(JSON.stringify(reopened.taskList.tasks)), JSON.parse(JSON.stringify(original.taskList.tasks)), "all serialized legacy task data survives the fork read");
  // The copied legacy fixture has a lightweight flag on a leaf. Reading it is
  // supported; explicitly correct that flag in the public structural edit.
  const modified = await run([{name: "set_goal_tasks", args: {mode: "upsert", expected_work_revision: "$current", tasks: [{id: "task-2", lightweight_subtasks: false}, {id: "fork-added", title: "An additional uncontracted trial task"}]}}]);
  assert(modified.details.goal.taskList.tasks.some(task => task.id === "fork-added"), JSON.stringify(modified.content));
  assert(modified.details.goal.retainedScope, "the legacy goal acquires retained scope through a public write");
  await close();
  cpSync(trial, forkWritten, {recursive: true, verbatimSymlinks: true});
  assert.notDeepEqual(snapshot(forkWritten), originalBytes);
  restore();
  assert.deepEqual(snapshot(trial), originalBytes, "package, settings, session and project files restore byte-for-byte");
  await open(savedSession, originalPackage);
  const restored = (await run([{name: "get_goal", args: {}}])).details.goal;
  assert.deepEqual(JSON.parse(JSON.stringify(restored.taskList.tasks)), JSON.parse(JSON.stringify(original.taskList.tasks)), "the restored upstream package reads its original data");
  assert(!restored.taskList.tasks.some(task => task.id === "fork-added"));
  await close();
  restore();
  assert.deepEqual(snapshot(trial), originalBytes, "leave the trial exactly restored after verification");
  writeFileSync(join(outputDirectory, "result.json"), JSON.stringify({passed: true, node: process.version, originalArtifact, forkArtifact, originalSha256: createHash("sha256").update(readFileSync(originalArtifact)).digest("hex"), forkSha256: createHash("sha256").update(readFileSync(forkArtifact)).digest("hex"), trial, pretrial, forkWritten, restoredFiles: originalBytes.length, goalId: legacy.id}, null, 2) + "\n");
  console.log(JSON.stringify({passed: true, restoredFiles: originalBytes.length, trial, pretrial, forkWritten}));
} finally { await close(); }
