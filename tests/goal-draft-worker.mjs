/** S1/S2 draft lifecycle through the real loader, public tools and session tree. */
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { AssistantMessageEventStream } from "@earendil-works/pi-ai";
import { createAgentSession, DefaultResourceLoader, ModelRuntime, SessionManager, SettingsManager } from "@earendil-works/pi-coding-agent";

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
const results = [], errors = [], dialogs = [];
let session, steps = [], requests = 0, summaries = 0, decision = "Continue", replacement = "Replace", auditor = "Disabled", duringDialog;
const objective = label => `1) Discuss ${label}. Done when the requirements are agreed.\n2) Implement ${label}. Done when its tests pass.`;
const proposal = (selectedMode, label) => ({ name: "propose_goal_draft", args: { objective: objective(label), sisyphus: selectedMode === "sisyphus", auto_continue: false } });
const latestDraft = () => session.sessionManager.getBranch().findLast(e => e.type === "custom" && e.customType === "pi-goal-draft");
const files = () => {
  const dir = join(cwd, ".pi", "goals");
  try { return readdirSync(dir).filter(n => n.startsWith("active_goal_")).map(n => [n, readFileSync(join(dir, n), "utf8")]); }
  catch { return []; }
};
async function open(manager) {
  const loader = new DefaultResourceLoader({ cwd, agentDir, settingsManager: settings, noSkills: true, noPromptTemplates: true, noThemes: true, noContextFiles: true,
    systemPrompt: "Discuss the synthetic fixture without starting unconfirmed goal work.",
    additionalExtensionPaths: [fileURLToPath(new URL("../extensions/goal.ts", import.meta.url))],
    extensionFactories: [pi => { pi.on("tool_result", event => results.push(event)); }],
  });
  await loader.reload({ resolveProjectTrust: async () => true });
  assert.deepEqual(loader.getExtensions().errors, []);
  const runtime = await ModelRuntime.create({ authPath: join(agentDir, "auth.json"), modelsPath: null, allowModelNetwork: false, refreshOnCreate: false });
  await runtime.setRuntimeApiKey("openai", "synthetic-unused");
  ({ session } = await createAgentSession({ cwd, agentDir, modelRuntime: runtime, model, thinkingLevel: "off", resourceLoader: loader, sessionManager: manager, settingsManager: settings }));
  await session.bindExtensions({ mode: "rpc", onError: error => errors.push(error), uiContext: {
    notify() {}, setStatus() {}, setWidget() {}, setEditorText() {}, onTerminalInput: () => () => {},
    input: async () => "Fixture custom answer", confirm: async () => false,
    select: async (title, choices) => {
      dialogs.push({ title, choices });
      if (title.startsWith("Confirm") && duringDialog) { const action = duringDialog; duringDialog = undefined; await action(); }
      const label = title.startsWith("Completion auditor") ? auditor : title.includes("already active") ? replacement : title.startsWith("Confirm") ? decision : "1.";
      return choices.find(choice => choice.includes(label)) ?? choices[0];
    },
  } });
  session.agent.streamFunction = (requestedModel, context) => {
    const summary = !context.tools?.length;
    if (summary) summaries++;
    else assert(++requests <= 100, "bounded draft fixture");
    const step = summary ? undefined : steps.shift();
    const content = step ? [{ type: "toolCall", id: `draft-${requests}`, name: step.name, arguments: step.args }]
      : [{ type: "text", text: summary ? "Unconfirmed discussion remains. No goal or implementation has been approved." : "Discussion awaits the user." }];
    const value = { role: "assistant", api: requestedModel.api, provider: requestedModel.provider, model: requestedModel.id, content,
      usage: { input: 100, output: 10, cacheRead: 0, cacheWrite: 0, totalTokens: 110, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } }, stopReason: step ? "toolUse" : "stop", timestamp: Date.now() };
    const stream = new AssistantMessageEventStream();
    stream.push({ type: "start", partial: value }); stream.push({ type: "done", reason: value.stopReason, message: value }); return stream;
  };
}
async function run(prompt, nextSteps) {
  steps = [...nextSteps];
  let settled, timeout;
  const done = new Promise((resolve, reject) => { settled = resolve; timeout = setTimeout(() => reject(new Error("Draft fixture did not settle")), 8000); });
  const unsubscribe = session.subscribe(event => { if (event.type === "agent_settled" && steps.length === 0) settled(); });
  try { await session.prompt(prompt); await done; assert.deepEqual(errors, []); }
  finally { clearTimeout(timeout); unsubscribe(); }
}
async function reopen() {
  const file = session.sessionManager.getSessionFile();
  await session.abort(); session.dispose();
  await open(SessionManager.open(file));
}
async function checkProposal(selectedMode, label) {
  const before = dialogs.length;
  await run("Review the selected branch's proposal.", [proposal(selectedMode, label)]);
  assert(dialogs.length > before, "selected branch draft reaches its own confirmation dialog");
  assert.match(results.at(-1).content.map(c => c.text ?? "").join(""), /refinement requested/);
  assert.equal(latestDraft().data.mode, selectedMode);
}
try {
  await open(SessionManager.create(cwd, join(work, "sessions")));
  await run(`/${mode} First discussion`, [
    { name: "read", args: { path: "reference.txt" } },
    { name: "goal_question", args: { question: "Which format?", options: ["CSV", "JSON"], allow_custom: false } },
    { name: "goal_questionnaire", args: { questions: [{ id: "output", question: "Output?", options: ["Report", "Chart"], allow_custom: false }] } },
    proposal(mode, "First discussion"),
  ]);
  assert.equal(latestDraft().data.auditorEnabled, false, "per-draft auditor choice survives refinement");
  assert.deepEqual(files(), [], "discussion creates no approved goal");
  if (scenario === "cancel") {
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
    await run(`/${secondMode} Second discussion`, [proposal(secondMode, "Second discussion")]);
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
    await run("Inspect the confirmed goal.", [{ name: "get_goal", args: {} }]);
    assert.equal(results.at(-1).details.goal.sisyphus, secondMode === "sisyphus");
    assert.match(results.at(-1).details.goal.objective, /Second branch after reopen/);
    assert.equal(results.at(-1).details.goal.skipAuditor, true);
  } else if (scenario === "stale") {
    decision = "Confirm";
    duringDialog = () => session.prompt("/goal-cancel");
    await run("Review a proposal while cancelling its draft separately.", [proposal(mode, "Cancelled during confirmation")]);
    assert.deepEqual(files(), [], "returning confirmation must not resurrect a cancelled draft");
    assert.match(results.at(-1).content.map(c => c.text ?? "").join(""), /stale|changed|cancelled/i);
    assert(latestDraft().data.clearedAt);
    assert(!session.getActiveToolNames().includes("propose_goal_draft"));
  } else throw new Error(`Unknown scenario ${scenario}`);
  assert.deepEqual(results.filter(r => r.isError), []);
  assert(!results.some(r => ["write", "edit", "bash"].includes(r.toolName)), "no unconfirmed implementation work");
  console.log(JSON.stringify({ passed: true, scenario, mode, requests, summaries, dialogs: dialogs.length }));
} finally {
  if (session) { await session.abort(); session.dispose(); }
  rmSync(work, { recursive: true, force: true });
}
