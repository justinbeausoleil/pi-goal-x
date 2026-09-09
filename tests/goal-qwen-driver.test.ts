/** Native S1 rehearsal of the S3 driver. This never counts as real-Qwen acceptance. */
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { homedir, tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import { makeFixture, milestones, objective, validationProbe } from "../experiments/reliability/qwen-fixture.ts";

for (const complete of [false, true]) test(`Qwen driver rehearses native boundaries and ${complete ? "artifact acceptance" : "incomplete rejection"}`, async () => {
	const matrix = mkdtempSync(join(tmpdir(), "goal-qwen-native-"));
	const project = join(homedir(), "Developer/scratch", `pi-goal-qwen-${basename(matrix)}-1`);
	const modelsPath = join(matrix, "models.json");
	const hash = (file: string) => createHash("sha256").update(readFileSync(file)).digest("hex");
	const writeJson = (file: string, value: unknown) => writeFileSync(file, JSON.stringify(value, null, 2));
	const expected = makeFixture(101).expected;
	// Deliberately synthetic outputs exercise the verifier's plumbing, not CSV
	// correctness. Only real model runs can earn the distinct D6 PASS label.
	const syntheticNormalizer = `// NATIVE_REHEARSAL_ONLY\nimport{readFileSync,mkdirSync,writeFileSync}from'node:fs';import{join}from'node:path';const input=readFileSync(process.argv[2],'utf8'),out=process.argv[3];mkdirSync(out,{recursive:true});const values=input.startsWith('id,category,amount,note\\r\\n')?${JSON.stringify(validationProbe.expected)}:${JSON.stringify(expected)};for(const[k,v]of Object.entries(values))writeFileSync(join(out,k+'.json'),JSON.stringify(v));`;
	const steps: any[] = [
		{ name: "set_goal_tasks", arguments: { tasks: milestones.map(task => ({ id: task.id, title: task.title, verification_contract: task.contract })) } },
		...milestones.slice(0, complete ? 6 : 3).flatMap(task => [
			{ name: "write", arguments: { path: `${task.id}-proof.txt`, content: "NATIVE_REHEARSAL_ONLY\n".repeat(200) } },
			...(complete && task.id === "docs" ? [
				{ name: "write", arguments: { path: "normalize.mjs", content: syntheticNormalizer } },
				{ name: "write", arguments: { path: "rehearsal.test.mjs", content: "import test from 'node:test'; test('NATIVE_REHEARSAL_ONLY',()=>{});" } },
				{ name: "write", arguments: { path: "README.md", content: "NATIVE_REHEARSAL_ONLY: normalize.mjs; node --test; duplicate amount category" } },
				{ name: "bash", arguments: { command: "node normalize.mjs input.csv output" } },
			] : []),
			{ name: "update_goal_task", arguments: { task_id: task.id, status: "complete", evidence: `${task.id}-proof.txt (synthetic native rehearsal)` } },
			{ name: "get_goal", arguments: {} },
		]),
		{ name: "update_goal", arguments: complete ? { status: "complete" } : { status: "paused", reason: "The native rehearsal has exercised all three boundaries.", suggested_action: "Inspect the independent rehearsal assertions." } },
	];
	let executor = 0, summaries = 0;
	const server = createServer(async (req, res) => {
		let raw = "";
		for await (const chunk of req) raw += chunk;
		const body = JSON.parse(raw), isExecutor = body.tools?.some((tool: any) => tool.function.name === "get_goal");
		const step = isExecutor ? steps[executor++] : undefined;
		if (!isExecutor) summaries++;
		if (step?.name === "update_goal_task") {
			const events = readFileSync(join(matrix, "run-01/events.ndjson"), "utf8").trim().split("\n").map(line => JSON.parse(line));
			step.arguments.expected_work_revision = events.reverse().find((event: any) => event.type === "public_tool_result" && event.event.details?.work_revision)?.event.details.work_revision;
		}
		res.writeHead(200, { "content-type": "text/event-stream" });
		const delta = step ? { role: "assistant", tool_calls: [{ index: 0, id: `call-${executor}`, type: "function", function: { name: step.name, arguments: JSON.stringify(step.arguments) } }] }
			: { role: "assistant", content: body.tools?.length && !isExecutor ? "Synthetic reviewer only.\n<approved/>" : "Synthetic native rehearsal summary. Read authoritative goal state for current tasks; no real-Qwen acceptance is claimed." };
		for (const [part, finish_reason] of [[delta, null], [{}, step ? "tool_calls" : "stop"]]) res.write(`data: ${JSON.stringify({ id: "native-rehearsal", object: "chat.completion.chunk", created: 1, model: "synthetic", choices: [{ index: 0, delta: part, finish_reason }] })}\n\n`);
		const promptTokens = Math.ceil(JSON.stringify(body.messages).length / 4);
		res.write(`data: ${JSON.stringify({ id: "native-rehearsal", choices: [], usage: { prompt_tokens: promptTokens, completion_tokens: 50, total_tokens: promptTokens + 50 } })}\n\n`);
		res.end("data: [DONE]\n\n");
	});
	try {
		await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
		const address = server.address(); assert(address && typeof address !== "string");
		const baseUrl = `http://127.0.0.1:${address.port}/v1`;
		writeJson(modelsPath, { providers: { "native-rehearsal": { baseUrl, api: "openai-completions", apiKey: "synthetic-unused", compat: { supportsUsageInStreaming: true, maxTokensField: "max_tokens" },
			models: [{ id: "synthetic", name: "Synthetic", reasoning: false, input: ["text"], contextWindow: 65536, maxTokens: 8192, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } }] } } });
		writeFileSync(join(matrix, "input-101.csv"), makeFixture(101).csv);
		writeFileSync(join(matrix, "objective.txt"), objective);
		writeJson(join(matrix, "expected-101.json"), expected);
		writeJson(join(matrix, "probe.json"), validationProbe);
		writeJson(join(matrix, "matrix.json"), {
			kind: "native-rehearsal", sourceCommit: "native-check-only", sourceHashes: {}, fixtureFiles: Object.fromEntries(["input-101.csv", "objective.txt", "expected-101.json", "probe.json"].map(file => [file, hash(join(matrix, file))])),
			artifact: resolve("package.json"), artifactSha256: hash(resolve("package.json")), installedPackage: resolve("."), packedFiles: {},
			modelsPath, modelsSha256: hash(modelsPath), modelConfiguration: { baseUrl }, provider: "native-rehearsal", pi: "0.85.1", node: process.version,
			contextWindow: 65536, maxOutput: 8192, temperature: 0.2, topP: 0.95,
			limits: { executorResponses: 60, elapsedMs: 20000, extensionRecoveries: 2 },
			compaction: { enabled: true, reserveTokens: 16384, keepRecentTokens: 512 },
			boundaries: [{ task: "parse", reason: "manual" }, { task: "normalize", reason: "threshold" }, { task: "aggregate", reason: "manual" }],
			ballast: { description: "synthetic native rehearsal" }, runs: [{ number: 1, model: "synthetic", seed: 101, thinking: "off" }],
		});
		let stderr = "";
		try {
			await promisify(execFile)(process.execPath, ["--experimental-strip-types", resolve("experiments/reliability/run-qwen.mjs"), "run", matrix, "1"], { timeout: 30000, maxBuffer: 4 * 1024 * 1024 });
			assert(complete, "an incomplete rehearsal must fail");
		} catch (error: any) { stderr = error.stderr ?? ""; assert.equal(error.code, 1, stderr); assert(!complete, error.stdout + stderr); }
		const result = JSON.parse(readFileSync(join(matrix, "run-01/result.json"), "utf8"));
		assert.equal(result.status, complete ? "REHEARSAL_PASS" : "REHEARSAL_FAIL");
		if (!complete) assert.match(result.error, /executor yielded before completing/, JSON.stringify(result, null, 2) + stderr);
		assert.deepEqual(result.compactions.map((item: any) => item.reason), ["manual", "threshold", "manual"]);
		assert(result.compactions.every((item: any) => !item.fromExtension && item.entry.summary));
		assert(summaries >= 3, "summaries must cross the actual provider boundary");
		assert.deepEqual(result.transitions.map((item: any) => item.task), milestones.slice(0, complete ? 6 : 3).map(task => task.id));
		assert.equal(result.finalGoal.status, complete ? "complete" : "paused");
		for (const task of milestones.slice(0, 3)) assert.equal(readFileSync(join(project, `${task.id}-proof.txt`), "utf8"), "NATIVE_REHEARSAL_ONLY\n".repeat(200));
	} finally {
		server.closeAllConnections();
		await new Promise<void>(resolve => server.close(() => resolve()));
		if (process.env.PI_GOAL_KEEP_REHEARSAL === "1") process.stderr.write(`Native rehearsal evidence: ${matrix}\n`);
		else { rmSync(matrix, { recursive: true, force: true }); if (existsSync(project)) rmSync(project, { recursive: true, force: true }); }
	}
});
