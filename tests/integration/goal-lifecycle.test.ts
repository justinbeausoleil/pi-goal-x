import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const worker = fileURLToPath(new URL("../goal-lifecycle-worker.mjs", import.meta.url));
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
