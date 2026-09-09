/**
 * Runs the experiment-harness shell tests (follow-up Stage 6) as part of the
 * fast suite. The bash tests stub curl/pi/tooling and exercise
 * SUPPORTED_CASES.json membership, raw-dir diagnostics, the MODEL-aware smoke
 * payload, missing configuration, HTTP/JSON validation, and portable timeout
 * discovery.
 */

import { execFile, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

test("experiment harness shell tests pass", () => {
	const script = path.resolve(import.meta.dirname, "shell", "harness.test.sh");
	const result = spawnSync("bash", [script], { encoding: "utf8", timeout: 120_000 });
	assert.equal(
		result.status,
		0,
		`harness shell tests failed (exit ${result.status})\n${result.stdout}\n${result.stderr}`,
	);
	assert.match(result.stdout, /harness shell tests: all passed/);
});

test("experiment driver binds the native SDK, drains direct startup and preserves a public pause", async () => {
	const root = mkdtempSync(path.join(tmpdir(), "goal-harness-sdk-"));
	const caseDir = path.join(root, "case"), runDir = path.join(root, "run");
	mkdirSync(caseDir);
	writeFileSync(path.join(caseDir, "INPUT.md"), "TURN: /goal-direct Verify HARNESS_NATIVE_012a.\nTURN: Report the paused goal with get_goal.\n");
	const requests: any[] = [];
	let holdResponse = false;
	let rejectRequest = false;
	let clarification = false;
	let transientFailures = 0, pauseNext = false;
	const server = createServer(async (req, res) => {
		let body = "";
		for await (const chunk of req) body += chunk;
		requests.push(JSON.parse(body));
		if (holdResponse) return;
		if (transientFailures > 0) {
			transientFailures--;
			res.writeHead(503, { "content-type": "application/json" });
			res.end(JSON.stringify({ error: { message: "503 Synthetic service unavailable", type: "server_error" } }));
			return;
		}
		if (rejectRequest) {
			res.writeHead(401, { "content-type": "application/json" });
			res.end(JSON.stringify({ error: { message: "Synthetic authorization failure", type: "authentication_error" } }));
			return;
		}
		const tool = requests.length === 1 || pauseNext
			? { name: "update_goal", arguments: JSON.stringify({ status: "paused", reason: "Synthetic provider requests a stop.", suggested_action: "Wait for user instructions." }) }
			: requests.length === 2 ? { name: "get_goal", arguments: "{}" } : undefined;
		pauseNext = false;
		res.writeHead(200, { "content-type": "text/event-stream" });
		for (const [delta, finish_reason] of [
			[{ role: "assistant", ...(tool ? { tool_calls: [{ index: 0, id: `call-${requests.length}`, type: "function", function: tool }] } : { content: clarification ? "Which file should I write? I will wait for your answer." : "The goal is paused." }) }, null],
			[{}, tool ? "tool_calls" : "stop"],
		]) res.write(`data: ${JSON.stringify({ id: "harness", object: "chat.completion.chunk", created: 1, model: "synthetic", choices: [{ index: 0, delta, finish_reason }] })}\n\n`);
		res.end("data: [DONE]\n\n");
	});
	try {
		await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
		const address = server.address();
		assert(address && typeof address !== "string");
		const modelsPath = path.join(root, "models.json");
		writeFileSync(modelsPath, JSON.stringify({ providers: { "harness-local": {
			baseUrl: `http://127.0.0.1:${address.port}/v1`, api: "openai-completions", apiKey: "synthetic-unused",
			models: [{ id: "synthetic", name: "Synthetic", reasoning: false, input: ["text"], contextWindow: 65536, maxTokens: 8192,
				cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } }],
		} } }));
		const run = (name: string, env = {}) => promisify(execFile)(process.execPath, [path.resolve("experiments/harness/drive.mjs"), caseDir, path.join(root, name)], {
			env: { ...process.env, PI_OFFLINE: "1", PI_GOAL_TEST_EXTENSION: process.env.PI_GOAL_TEST_EXTENSION ?? path.resolve("extensions/goal.ts"),
				PI_GOAL_TEST_PROVIDER: "harness-local", PI_GOAL_TEST_MODEL: "synthetic", PI_GOAL_TEST_MODELS_FILE: modelsPath,
				PI_GOAL_TEST_THINKING: "off", PI_GOAL_TEST_TURN_TIMEOUT: "10", PI_GOAL_QUIET_MS: "100", ...env },
			timeout: 30_000, maxBuffer: 4 * 1024 * 1024,
		});
		const { stdout, stderr } = await run("run");
		const events = stdout.trim().split("\n").map(line => JSON.parse(line));
		assert.equal(requests.length, 3, stderr);
		assert.match(JSON.stringify(requests[0].messages), /HARNESS_NATIVE_012a/);
		assert(requests[0].tools.some((tool: any) => tool.function.name === "update_goal"));
		assert.equal(events.filter(event => event.type === "_turn_done").length, 2);
		const inspection = events.find(event => event.type === "tool_execution_end" && event.toolName === "get_goal");
		assert.equal(inspection?.result?.details?.goal?.status, "paused", stdout);
		assert(!events.some(event => event.type === "_drive_error"));
		const goals = path.join(runDir, "sandbox/.pi/goals");
		const file = readdirSync(goals).find(name => name.startsWith("active_goal_"));
		assert(file);
		assert.match(readFileSync(path.join(goals, file), "utf8"), /"status": "paused"/);

		// A command returns before its queued executor finishes. The drain deadline
		// must still fail the trial, even though session.prompt itself resolved.
		holdResponse = true;
		writeFileSync(path.join(caseDir, "INPUT.md"), "TURN: /goal-direct Verify a bounded stalled executor.\n");
		await assert.rejects(run("timeout", { PI_GOAL_TEST_TURN_TIMEOUT: "0.5" }), (error: any) => {
			assert.equal(error.code, 124);
			assert.match(error.stdout, /_drive_error.*timeout/);
			return true;
		});
		holdResponse = false;
		writeFileSync(path.join(caseDir, "INPUT.md"), "TURN: Inspect the synthetic configuration.\n");
		for (const name of ["env.json", "compaction.json"]) {
			writeFileSync(path.join(caseDir, name), "{malformed");
			await assert.rejects(run(`invalid-${name}`), (error: any) => {
				assert.notEqual(error.code, 0);
				assert.match(error.stderr, new RegExp(name));
				return true;
			});
			rmSync(path.join(caseDir, name));
		}
		await assert.rejects(run("invalid-timeout", { PI_GOAL_TEST_TURN_TIMEOUT: "Infinity" }), /Invalid harness timeout/);
		rejectRequest = true;
		for (const [name, input] of [["unfocused", "Inspect the synthetic configuration."], ["active", "/goal-direct Verify error reporting."]]) {
			writeFileSync(path.join(caseDir, "INPUT.md"), `TURN: ${input}\n`);
			await assert.rejects(run(`provider-error-${name}`, { PI_GOAL_TEST_TURN_TIMEOUT: "0.5" }), (error: any) => {
				assert.equal(error.code, 1);
				assert.match(error.stdout, /_drive_error.*Synthetic authorization failure/);
				return true;
			});
		}
		rejectRequest = false;
		holdResponse = true;
		writeFileSync(path.join(caseDir, "INPUT.md"), "ABORT_AFTER_MS: 100\nTURN: Wait for a scheduled user abort.\n");
		const abort = await run("scheduled-abort");
		assert.match(abort.stdout, /_drive_abort_scheduled/);
		assert(!abort.stdout.includes('"type":"_drive_error"'));
		holdResponse = false;
		clarification = true;
		writeFileSync(path.join(caseDir, "INPUT.md"), "TURN: /goal-direct Clarify which file to write.\nTURN: /goal-pause\n");
		const yielded = await run("yield-followup", { PI_GOAL_TEST_TURN_TIMEOUT: "0.5" });
		assert.equal(yielded.stdout.split('"type":"_turn_done"').length - 1, 2, "a legitimate yield must allow the next user command");
		clarification = false;
		transientFailures = 3;
		pauseNext = true;
		writeFileSync(path.join(caseDir, "INPUT.md"), "TURN: /goal-direct Verify bounded recovery after a transient outage.\n");
		const recovered = await run("delayed-recovery", { PI_GOAL_TEST_TURN_TIMEOUT: "15", PI_GOAL_NETWORK_RECOVERY_MAX_ATTEMPTS: "1", PI_GOAL_NETWORK_RECOVERY_MAX_DELAY_MS: "300" });
		const recoveryEvents = recovered.stdout.trim().split("\n").map(line => JSON.parse(line));
		const checkpoints = recoveryEvents.filter(event => event.type === "message_start" && event.message?.customType === "pi-goal-event");
		assert.equal(checkpoints.length, 2, "startup plus extension recovery must survive the shorter quiet window");
		assert(recoveryEvents.some(event => event.type === "tool_execution_end" && event.toolName === "update_goal" && event.result?.details?.goal?.status === "paused"));
	} finally {
		server.closeAllConnections();
		await new Promise<void>(resolve => server.close(() => resolve()));
		rmSync(root, { recursive: true, force: true });
	}
});
