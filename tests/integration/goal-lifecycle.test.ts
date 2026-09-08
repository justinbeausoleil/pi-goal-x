import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const worker = fileURLToPath(new URL("../goal-lifecycle-worker.mjs", import.meta.url));
for (const mode of ["goal-direct", "sisyphus-direct", "goal", "sisyphus", "create_goal", "reject-stale", "reject-malformed", "reject-paused", "reject-replaced", "reject-unfocused"]) {
test(`S1: actual Pi ${mode} startup and second checkpoint`, { timeout: 15000 }, async () => {
	const { stdout } = await run(process.execPath, ["--experimental-strip-types", worker, mode], {
		timeout: 12000,
		env: { ...process.env, PI_SUBAGENT_CHILD: "", PI_SUBAGENT_DEPTH: "", PI_GOAL_AUTO_CONFIRM: "" },
	});
	assert.equal(JSON.parse(stdout.trim().split("\n").at(-1)!).passed, true);
});
}
