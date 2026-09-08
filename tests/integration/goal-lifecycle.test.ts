import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const worker = fileURLToPath(new URL("../goal-lifecycle-worker.mjs", import.meta.url));
for (const mode of ["goal-direct", "sisyphus-direct", "goal", "sisyphus", "create_goal", "reject-stale", "reject-malformed", "reject-malformed-prefix", "reject-malformed-large", "reject-malformed-long-id", "reject-paused", "reject-replaced", "reject-unfocused", "budget-wrapup"]) {
test(`S1: actual Pi ${mode} startup and second checkpoint`, { timeout: 15000 }, async () => {
	const { stdout } = await run(process.execPath, ["--experimental-strip-types", worker, mode], {
		timeout: 12000,
		env: { ...process.env, PI_SUBAGENT_CHILD: "", PI_SUBAGENT_DEPTH: "", PI_GOAL_AUTO_CONFIRM: "" },
	});
	assert.equal(JSON.parse(stdout.trim().split("\n").at(-1)!).passed, true);
});
}

for (const args of [["manual"], ["threshold"], ["overflow"], ["manual", "--long"], ["manual", "--long", "--advice-review"], ["manual", "--stall"], ...["blocked", "budget_limited", "unfocused", "complete"].map(state => ["manual", `--stopped=${state}`]), ...["blocked", "budget_limited"].map(state => ["manual", "--audit-only", `--stopped=${state}`])]) {
	test(`S1: three real ${args.join(" ")} compactions retain public task progress`, { timeout: 25000 }, async () => {
		const compactionWorker = fileURLToPath(new URL("../goal-compaction-worker.mjs", import.meta.url));
		const { stdout } = await run(process.execPath, ["--experimental-strip-types", compactionWorker, ...args], {
			timeout: 22000,
			env: { ...process.env, PI_SUBAGENT_CHILD: "", PI_SUBAGENT_DEPTH: "" },
		});
		assert.equal(JSON.parse(stdout.trim().split("\n").at(-1)!).passed, true);
	});
}
