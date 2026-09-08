import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
for (const control of ["text", "inspect", "echo", "ls", "work", "redirect", "clarify"]) test(`S1: native ${control}-only continuation preserves the no-progress boundary and explicit resume`, {timeout: 15000}, async () => {
	const {stdout} = await run(process.execPath, ["--experimental-strip-types", fileURLToPath(new URL("../goal-stop-worker.mjs", import.meta.url)), "idle", control], {timeout: 12000, env: {...process.env, PI_SUBAGENT_CHILD: "", PI_SUBAGENT_DEPTH: ""}});
	assert.equal(JSON.parse(stdout.trim().split("\n").at(-1)!).passed, true);
});

const worker = fileURLToPath(new URL("../goal-lifecycle-worker.mjs", import.meta.url));
for (const outcome of ["disabled", "needs_human", "insufficient_context", "config", "provider", "malformed", "invalid-index"]) test(`S1: native Oracle ${outcome} retains its disposition and configured cap`, {timeout: 15000}, async () => {
	const {stdout} = await run(process.execPath, ["--experimental-strip-types", fileURLToPath(new URL("../goal-stop-worker.mjs", import.meta.url)), "oracle-outcome", outcome], {timeout: 12000, env: {...process.env, PI_SUBAGENT_CHILD: "", PI_SUBAGENT_DEPTH: ""}});
	assert.equal(JSON.parse(stdout.trim().split("\n").at(-1)!).passed, true);
});
for (const control of ["plain", "reopen", "resources"]) test(`S1/S2: native Oracle ${control} advice requires a work attempt before re-blocking`, {timeout: 15000}, async () => {
	const {stdout} = await run(process.execPath, ["--experimental-strip-types", fileURLToPath(new URL("../goal-stop-worker.mjs", import.meta.url)), "oracle-followup", control], {timeout: 12000, env: {...process.env, PI_SUBAGENT_CHILD: "", PI_SUBAGENT_DEPTH: ""}});
	assert.equal(JSON.parse(stdout.trim().split("\n").at(-1)!).passed, true);
});
for (const mode of ["manual", "threshold", "overflow"]) test(`S1: native ${mode} compaction separates executor and auxiliary usage`, {timeout: 20000}, async () => {
	const {stdout} = await run(process.execPath, ["--experimental-strip-types", fileURLToPath(new URL("../goal-compaction-worker.mjs", import.meta.url)), mode, "--accounting", ...(mode === "manual" ? ["--advice-review"] : [])], {timeout: 18000, env: {...process.env, PI_SUBAGENT_CHILD: "", PI_SUBAGENT_DEPTH: ""}});
	assert.equal(JSON.parse(stdout.trim().split("\n").at(-1)!).passed, true);
});
for (const mode of ["goal", "sisyphus"]) for (const status of ["paused", "blocked"]) test(`S2: native exhausted ${status} ${mode} tweak preserves its stop`, {timeout: 15000}, async () => {
	const {stdout} = await run(process.execPath, ["--experimental-strip-types", fileURLToPath(new URL("../goal-draft-worker.mjs", import.meta.url)), `tweak-lifecycle-${status}`, mode, "--exhausted"], {timeout: 12000, env: {...process.env, PI_SUBAGENT_CHILD: "", PI_SUBAGENT_DEPTH: ""}});
	assert.equal(JSON.parse(stdout.trim().split("\n").at(-1)!).passed, true);
});
test("S2: native resume and focus cannot bypass a user-lowered exhausted budget", {timeout: 15000}, async () => {
	const {stdout} = await run(process.execPath, ["--experimental-strip-types", fileURLToPath(new URL("../goal-stop-worker.mjs", import.meta.url)), "response", "unfocus", "--accounting", "--exhausted-edit"], {timeout: 12000, env: {...process.env, PI_SUBAGENT_CHILD: "", PI_SUBAGENT_DEPTH: ""}});
	assert.equal(JSON.parse(stdout.trim().split("\n").at(-1)!).passed, true);
});
for (const scenario of ["budget-raise", "budget-remove", "budget-paused-reopen-confirm"]) test(`S2: native ${scenario} preserves exhaustion through compaction and reopen until explicit resume`, {timeout: 15000}, async () => {
	const {stdout} = await run(process.execPath, ["--experimental-strip-types", fileURLToPath(new URL("../goal-ownership-worker.mjs", import.meta.url)), scenario], {timeout: 12000, env: {...process.env, PI_SUBAGENT_CHILD: "", PI_SUBAGENT_DEPTH: ""}});
	assert.equal(JSON.parse(stdout.trim().split("\n").at(-1)!).passed, true);
});
for (const mode of ["goal", "sisyphus", "create_goal"]) test(`S1: native ${mode} creation charges controlled active time`, {timeout: 15000}, async () => {
	const {stdout} = await run(process.execPath, ["--experimental-strip-types", worker, mode, "--clock"], {timeout: 12000, env: {...process.env, PI_SUBAGENT_CHILD: "", PI_SUBAGENT_DEPTH: ""}});
	assert.equal(JSON.parse(stdout.trim().split("\n").at(-1)!).passed, true);
});
for (const control of ["pause", "abort", "unfocus", "switch", "replace", "clear"]) test(`S1: native controlled active time through creation and ${control}`, {timeout: 15000}, async () => {
	const {stdout} = await run(process.execPath, ["--experimental-strip-types", fileURLToPath(new URL("../goal-stop-worker.mjs", import.meta.url)), "response", control, "--accounting", "--clock"], {timeout: 12000, env: {...process.env, PI_SUBAGENT_CHILD: "", PI_SUBAGENT_DEPTH: ""}});
	assert.equal(JSON.parse(stdout.trim().split("\n").at(-1)!).passed, true);
});
for (const boundary of ["agent", "agent-block", "completion"]) test(`S1: native controlled active time through ${boundary} stop`, {timeout: 15000}, async () => {
	const {stdout} = await run(process.execPath, ["--experimental-strip-types", fileURLToPath(new URL("../goal-stop-worker.mjs", import.meta.url)), boundary, "pause", "--accounting", "--clock"], {timeout: 12000, env: {...process.env, PI_SUBAGENT_CHILD: "", PI_SUBAGENT_DEPTH: ""}});
	assert.equal(JSON.parse(stdout.trim().split("\n").at(-1)!).passed, true);
});
for (const control of ["unfocus", "switch"]) for (const fault of [false, true]) test(`S2: native late budget after ${control}${fault ? " with unpaid retry" : ""} limits the originating goal`, {timeout: 15000}, async () => {
	const {stdout} = await run(process.execPath, ["--experimental-strip-types", fileURLToPath(new URL("../goal-stop-worker.mjs", import.meta.url)), "response", control, "--accounting", "--late-budget", ...(fault ? ["--usage-fault"] : [])], {timeout: 12000, env: {...process.env, PI_SUBAGENT_CHILD: "", PI_SUBAGENT_DEPTH: ""}});
	assert.equal(JSON.parse(stdout.trim().split("\n").at(-1)!).passed, true);
});
test("S2: native unpaid usage follows a later successful archive", {timeout: 15000}, async () => {
	const {stdout} = await run(process.execPath, ["--experimental-strip-types", fileURLToPath(new URL("../goal-stop-worker.mjs", import.meta.url)), "response", "pause", "--accounting", "--usage-fault", "--clear-unpaid"], {timeout: 12000, env: {...process.env, PI_SUBAGENT_CHILD: "", PI_SUBAGENT_DEPTH: ""}});
	assert.equal(JSON.parse(stdout.trim().split("\n").at(-1)!).passed, true);
});
test("S1: native terminal pause charges every executor response once", {timeout: 15000}, async () => {
	const {stdout} = await run(process.execPath, ["--experimental-strip-types", fileURLToPath(new URL("../goal-stop-worker.mjs", import.meta.url)), "checkpoint-agent", "pause", "--accounting"], {timeout: 12000, env: {...process.env, PI_SUBAGENT_CHILD: "", PI_SUBAGENT_DEPTH: ""}});
	assert.equal(JSON.parse(stdout.trim().split("\n").at(-1)!).passed, true);
});
for (const [boundary, control] of [
	...["pause", "abort", "unfocus", "switch", "replace", "clear"].map(control => ["response", control]),
	["ordinary", "replace"],
	["provider-retry", "pause"],
]) test(`S1: native accounting ${boundary}/${control} retains the response's originating goal`, {timeout: 15000}, async () => {
	const {stdout} = await run(process.execPath, ["--experimental-strip-types", fileURLToPath(new URL("../goal-stop-worker.mjs", import.meta.url)), boundary!, control!, "--accounting"], {timeout: 12000, env: {...process.env, PI_SUBAGENT_CHILD: "", PI_SUBAGENT_DEPTH: ""}});
	assert.equal(JSON.parse(stdout.trim().split("\n").at(-1)!).passed, true);
});
for (const control of ["pause", "unfocus", "switch", "clear"]) test(`S2: native unpaid usage after ${control} retries without changing focus`, {timeout: 15000}, async () => {
	const {stdout} = await run(process.execPath, ["--experimental-strip-types", fileURLToPath(new URL("../goal-stop-worker.mjs", import.meta.url)), "response", control, "--accounting", "--usage-fault"], {timeout: 12000, env: {...process.env, PI_SUBAGENT_CHILD: "", PI_SUBAGENT_DEPTH: ""}});
	assert.equal(JSON.parse(stdout.trim().split("\n").at(-1)!).passed, true);
});
for (const [boundary, control] of [
	...["response", "dispatched"].flatMap(boundary => ["pause", "pause-resume", "esc", "abort", "unfocus", "switch", "switch-active", "clear"].map(control => [boundary, control])),
	...["pause", "unfocus", "switch", "clear"].map(control => ["ordinary", control]),
	...["response", "dispatched", "dialog", "audit", "oracle", "ordinary"].map(boundary => [boundary, "replace"]),
	["dispatched", "replace-ordered"],
	...["pause", "unfocus", "switch", "clear"].map(control => ["next-turn", control]),
	...["pause", "unfocus", "switch", "clear"].map(control => ["host-followup", control]),
	["replay", "pause-resume"],
	...["pause", "esc", "unfocus", "switch", "clear", "reload", "reopen"].map(control => ["replay", control]),
	["dashboard", "esc"],
	...["steering", "steering-followup"].flatMap(boundary => ["steering-only", "pause", "esc", "abort", "unfocus", "switch", "clear"].map(control => [boundary, control])),
	...["dialog", "audit", "oracle"].flatMap(boundary => ["pause", "esc", "abort", "unfocus", "switch", "clear", "pause-resume", "switch-active"].map(control => [boundary, control])),
	...["dialog", "audit", "oracle"].map(boundary => [boundary, "serial"]),
	...["pause", "esc", "unfocus", "switch", "clear"].map(control => ["queued", control]),
	["agent", "pause"],
	["checkpoint-agent", "pause"],
	["checkpoint-agent", "agent-resume"],
]) test(`S1/S2: native stop ${boundary}/${control} prevents later work and preserves fresh user intent`, {timeout: 15000}, async () => {
	const {stdout} = await run(process.execPath, ["--experimental-strip-types", fileURLToPath(new URL("../goal-stop-worker.mjs", import.meta.url)), boundary!, control!], {
		timeout: 12000, env: {...process.env, PI_SUBAGENT_CHILD: "", PI_SUBAGENT_DEPTH: ""},
	});
	assert.equal(JSON.parse(stdout.trim().split("\n").at(-1)!).passed, true);
});
for (const scenario of ["storage-write", "storage-lock-access", "storage-lock", "storage-clear-lock", "storage-ledger", "storage-conflict", "storage-resume", "storage-resume-confirm", "storage-pause", "clear-cancel", "clear-confirm", "clear-failure", "clear-unlink-failure", "clear-stale", "resume-stale-proposal-confirm", "resume-stale-control-confirm", "resume-stale-tree-confirm", "resume-stale-session-confirm", "child-fresh", "child-fork", "child-reopen", "child-nested"]) test(`S2: native ${scenario} preserves ownership and authoritative mutation outcomes`, {timeout: 15000}, async () => {
	const {stdout} = await run(process.execPath, ["--experimental-strip-types", fileURLToPath(new URL("../goal-ownership-worker.mjs", import.meta.url)), scenario], {
		timeout: 12000, env: {...process.env, PI_SUBAGENT_CHILD: "", PI_SUBAGENT_DEPTH: ""},
	});
	assert.equal(JSON.parse(stdout.trim().split("\n").at(-1)!).passed, true);
});
for (const scenario of ["record-corrupt", "record-symlink", "record-path", "record-snapshot", "record-snapshot-status", "record-snapshot-complete", "record-snapshot-task", "record-snapshot-scope", "record-snapshot-path"]) test(`S2: native ${scenario} preserves valid task progress and unrelated files`, {timeout: 15000}, async () => {
	const {stdout} = await run(process.execPath, ["--experimental-strip-types", fileURLToPath(new URL("../goal-ownership-worker.mjs", import.meta.url)), scenario], {
		timeout: 12000, env: {...process.env, PI_SUBAGENT_CHILD: "", PI_SUBAGENT_DEPTH: ""},
	});
	assert.equal(JSON.parse(stdout.trim().split("\n").at(-1)!).passed, true);
});
for (const scenario of ["legacy-refresh", "recovery", "recovery-read-report", "recovery-lock-race", "recovery-copy-race", "recovery-backup-race", "recovery-session-stale", "recovery-backup-failure", "recovery-item-failure", "recovery-snapshot-failure", "recovery-scan-failure", "recovery-read-failure"]) test(`S2: native ${scenario} preserves storage and diagnoses repair outcomes`, {timeout: 15000}, async () => {
	const {stdout} = await run(process.execPath, ["--experimental-strip-types", fileURLToPath(new URL("../goal-ownership-worker.mjs", import.meta.url)), scenario], {
		timeout: 12000, env: {...process.env, PI_SUBAGENT_CHILD: "", PI_SUBAGENT_DEPTH: ""},
	});
	assert.equal(JSON.parse(stdout.trim().split("\n").at(-1)!).passed, true);
});
for (const scenario of ["tree", "tree-paused-confirm", "fork", "new", "new-auto", "missing-focus", "reopen-paused-confirm", ...["reopen", "reload"].flatMap(boundary => ["active", "paused", "blocked", "budget_limited"].map(status => `${boundary}-${status}`))]) test(`S1/S2: native ${scenario} preserves progress without inherited work authority`, {timeout: 15000}, async () => {
	const {stdout} = await run(process.execPath, ["--experimental-strip-types", fileURLToPath(new URL("../goal-ownership-worker.mjs", import.meta.url)), scenario], {
		timeout: 12000, env: {...process.env, PI_SUBAGENT_CHILD: "", PI_SUBAGENT_DEPTH: ""},
	});
	assert.equal(JSON.parse(stdout.trim().split("\n").at(-1)!).passed, true);
});
for (const mode of ["goal", "sisyphus"]) for (const scenario of ["draft-affordances", "cancel", "branches", "stale", "stale-question", "stale-questionnaire", "selector-stale", "fork", "fork-tweak", "active-refine", "active-cancel", "active-settings", "paused-refine", "blocked-refine", "scope", "scope-tweak", "scope-external", "scope-external-goal-contract", "scope-external-task-contract", "scope-external-task-title", "scope-external-new-task", "scope-audit", ...["active", "paused", "blocked", "budget_limited"].map(status => `tweak-lifecycle-${status}`)]) {
	test(`S1/S2: ${mode} draft ${scenario} uses native dialogs and branch state`, { timeout: 15000 }, async () => {
		const { stdout } = await run(process.execPath, ["--experimental-strip-types", fileURLToPath(new URL("../goal-draft-worker.mjs", import.meta.url)), scenario, mode], {
			timeout: 12000, env: { ...process.env, PI_SUBAGENT_CHILD: "", PI_SUBAGENT_DEPTH: "" },
		});
		assert.equal(JSON.parse(stdout.trim().split("\n").at(-1)!).passed, true);
	});
}
test("S1: native TUI compositor keeps large-plan overlay and confirmation reachable", { timeout: 15000 }, async () => {
	const { stdout } = await run(process.execPath, ["--experimental-strip-types", fileURLToPath(new URL("../goal-task-overlay-host-worker.mjs", import.meta.url))], { timeout: 12000 });
	assert.match(stdout, /PASS: native host overlay and confirmation/);
});
for (const args of [[], ["--concurrent-accounting"], ["--details"]]) test(`S1/S2: public 180+20-node task plan survives rejected writes and session reopen ${args.join(" ")}`, { timeout: 25000 }, async () => {
	const { stdout } = await run(process.execPath, ["--experimental-strip-types", fileURLToPath(new URL("../goal-task-plan-worker.mjs", import.meta.url)), ...args], {
		timeout: 22000, env: { ...process.env, PI_SUBAGENT_CHILD: "", PI_SUBAGENT_DEPTH: "" },
	});
	assert.equal(JSON.parse(stdout.trim().split("\n").at(-1)!).passed, true);
});
for (const mode of ["goal-direct", "sisyphus-direct", "goal", "sisyphus", "create_goal", "reject-stale", "reject-malformed", "reject-malformed-prefix", "reject-malformed-large", "reject-malformed-long-id", "reject-paused", "reject-replaced", "reject-unfocused", "budget-wrapup"]) {
test(`S1: actual Pi ${mode} startup and second checkpoint`, { timeout: 15000 }, async () => {
	const { stdout } = await run(process.execPath, ["--experimental-strip-types", worker, mode], {
		timeout: 12000,
		env: { ...process.env, PI_SUBAGENT_CHILD: "", PI_SUBAGENT_DEPTH: "", PI_GOAL_AUTO_CONFIRM: "" },
	});
	assert.equal(JSON.parse(stdout.trim().split("\n").at(-1)!).passed, true);
});
}

for (const args of [["manual"], ["threshold"], ["overflow"], ["manual", "--long"], ["manual", "--long", "--advice-review"], ["manual", "--stall"], ...["manual", "threshold", "overflow"].map(mode => [mode, "--large", "--long", "--advice-review"]), ...["blocked", "budget_limited", "unfocused", "complete"].map(state => ["manual", `--stopped=${state}`]), ...["blocked", "budget_limited"].map(state => ["manual", "--audit-only", `--stopped=${state}`])]) {
	test(`S1: three real ${args.join(" ")} compactions retain public task progress`, { timeout: 25000 }, async () => {
		const compactionWorker = fileURLToPath(new URL("../goal-compaction-worker.mjs", import.meta.url));
		const { stdout } = await run(process.execPath, ["--experimental-strip-types", compactionWorker, ...args], {
			timeout: 22000,
			env: { ...process.env, PI_SUBAGENT_CHILD: "", PI_SUBAGENT_DEPTH: "" },
		});
		assert.equal(JSON.parse(stdout.trim().split("\n").at(-1)!).passed, true);
	});
}
