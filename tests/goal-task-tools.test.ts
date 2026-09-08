import { readWorkRevision } from "./task-tool-client.ts";
/**
 * Stage 4 task-tool tests: flat parent-linked set_goal_tasks conversion and
 * validation, id-stable merging, and the update_goal_task discriminated union.
 */

import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import type { ExtensionContext, ToolDefinition } from "@earendil-works/pi-coding-agent";
import goalExtension from "../extensions/goal.ts";
import { convertFlatTasks, countTasks, mergeTasksWithExisting, type FlatTaskInput } from "../extensions/goal-task-tools.ts";
import { createGoal, goalFocusDetails, type GoalTask } from "../extensions/goal-record.ts";
import { parseGoalFile, writeActiveGoalFile } from "../extensions/storage/goal-files.ts";
import { goalLedgerPath } from "../extensions/goal-ledger.ts";

// ── Flat conversion unit tests ───────────────────────────────────────────────

test("task confirmation cancellation and concurrent public progress cannot overwrite the plan", async () => {
	const f = fixtureWithTasks([]);
	const oldAutoConfirm = process.env.PI_GOAL_AUTO_CONFIRM;
	delete process.env.PI_GOAL_AUTO_CONFIRM;
	try {
		const h = createHarness(f.cwd, f.sessionEntries);
		await h.handlers.get("session_start")?.({ reason: "start" }, h.ctx);
		const call = (client: typeof h, name: string, params: unknown) => (client.tools.get(name)!.execute as any)("confirmation", params, undefined, undefined, client.ctx);
		const initial = await call(h, "set_goal_tasks", { tasks: [{ id: "a", title: "A" }, { id: "b", title: "B" }] });
		const other = createHarness(f.cwd, f.sessionEntries);
		await other.handlers.get("session_start")?.({ reason: "start" }, other.ctx);
		Object.assign(h.ctx, { hasUI: true });
		h.ctx.ui.custom = (async () => {
			const result = await call(other, "update_goal_task", { task_id: "a", status: "complete", evidence: "Concurrent proof", expected_work_revision: initial.details.work_revision });
			assert.equal(result.details.goal.taskList.tasks[0].status, "complete");
			return { decision: "confirm" };
		}) as typeof h.ctx.ui.custom;
		const stale = await call(h, "set_goal_tasks", { tasks: [{ id: "a", title: "A" }], expected_work_revision: initial.details.work_revision });
		assert.match(stale.content[0].text, /expected_work_revision/);
		assert.deepEqual(stale.details.goal.taskList.tasks.map((t: GoalTask) => [t.id, t.status]), [["a", "complete"], ["b", "pending"]]);
		const before = readFileSync(path.join(f.cwd, f.goal.activePath!), "utf8");
		h.ctx.ui.custom = (async () => ({ decision: "cancel" })) as typeof h.ctx.ui.custom;
		const cancelled = await call(h, "set_goal_tasks", { tasks: [{ id: "a", title: "A" }], expected_work_revision: stale.details.work_revision });
		assert.match(cancelled.content[0].text, /kept unchanged/);
		assert.equal(readFileSync(path.join(f.cwd, f.goal.activePath!), "utf8"), before);
	} finally {
		if (oldAutoConfirm === undefined) delete process.env.PI_GOAL_AUTO_CONFIRM; else process.env.PI_GOAL_AUTO_CONFIRM = oldAutoConfirm;
		f.cleanup();
	}
});

test("public task writes reject missing/stale work revisions but accept accounting-only changes", async () => {
	const f = fixtureWithTasks([]);
	try {
		const h = createHarness(f.cwd, f.sessionEntries);
		await h.handlers.get("session_start")?.({ reason: "start" }, h.ctx);
		const call = (name: string, params: unknown) => (h.tools.get(name)!.execute as any)("revision", params, undefined, undefined, h.ctx);
		const initial = await call("set_goal_tasks", { tasks: [{ id: "a", title: "A" }, { id: "b", title: "B" }] });
		const revision = initial.details.work_revision;
		assert.equal(typeof revision, "string");
		const snapshot = () => readFileSync(path.join(f.cwd, f.goal.activePath!), "utf8");
		const before = snapshot();
		for (const [name, params] of [
			["set_goal_tasks", { mode: "upsert", tasks: [{ id: "b", title: "Changed" }] }],
			["update_goal_task", { task_id: "a", status: "start" }],
			["update_goal_task", { updates: [{ task_id: "a", status: "start" }] }],
		] as const) {
			const result = await call(name, params);
			assert.match(result.content[0].text, /expected_work_revision.*get_goal/);
			assert.equal(result.details.work_revision, revision);
			assert.equal(snapshot(), before, "missing revision must not write any record");
		}
		const accounting = activeGoal(f.cwd)!;
		accounting.usage.tokensUsed += 100; accounting.usage.activeSeconds += 20;
		accounting.revision = (accounting.revision ?? 0) + 1; accounting.updatedAt = new Date().toISOString();
		writeActiveGoalFile(h.ctx, accounting);
		const complete = await call("update_goal_task", { task_id: "a", status: "complete", evidence: "Observed proof", expected_work_revision: revision });
		assert.equal(complete.details.goal.taskList.tasks[0].status, "complete");
		assert.notEqual(complete.details.work_revision, revision);
		const after = snapshot();
		for (const [name, params] of [
			["set_goal_tasks", { mode: "upsert", tasks: [{ id: "b", title: "Changed" }] }],
			["update_goal_task", { task_id: "b", status: "start" }],
			["update_goal_task", { updates: [{ task_id: "b", status: "start" }] }],
		] as const) {
			const result = await call(name, { ...params, expected_work_revision: revision });
			assert.match(result.content[0].text, /expected_work_revision.*get_goal/);
			assert.equal(result.details.work_revision, complete.details.work_revision);
			assert.equal(snapshot(), after, "stale revision must not write any member");
		}
		const timestamps = activeGoal(f.cwd)!;
		timestamps.createdAt = "2026-09-01T00:00:00Z";
		timestamps.taskList!.proposedAt = "2026-09-02T00:00:00Z";
		timestamps.taskList!.tasks[0]!.completedAt = "2026-09-03T00:00:00Z";
		writeActiveGoalFile(h.ctx, timestamps);
		assert.equal((await call("get_goal", {})).details.work_revision, complete.details.work_revision, "all wall-clock fields are excluded");
		const started = await call("update_goal_task", { task_id: "b", status: "start", expected_work_revision: complete.details.work_revision });
		assert.equal(started.details.goal.currentTaskId, "b");
	} finally { f.cleanup(); }
});

test("ordinary structural writes cannot erase contracts or edit completed task requirements", async () => {
	const f = fixtureWithTasks([]);
	try {
		const h = createHarness(f.cwd, f.sessionEntries);
		await h.handlers.get("session_start")?.({ reason: "start" }, h.ctx);
		const call = (name: string, params: unknown) => (h.tools.get(name)!.execute as any)("scope", params, undefined, undefined, h.ctx);
		const tasks = [{ id: "a", title: "A", verification_contract: "Observe A" }, { id: "b", title: "B" }];
		const initial = await call("set_goal_tasks", { tasks });
		const complete = await call("update_goal_task", { expected_work_revision: initial.details.work_revision, task_id: "a", status: "complete", evidence: "Observed A" });
		const expected_work_revision = complete.details.work_revision;
		const before = readFileSync(path.join(f.cwd, f.goal.activePath!), "utf8");
		for (const params of [
			{ mode: "upsert", tasks: [{ id: "a", title: "A changed" }] },
			{ mode: "replace", tasks: [{ ...tasks[0], title: "A changed" }, tasks[1]] },
			{ mode: "upsert", tasks: [{ id: "a", verification_contract: "Weaker evidence" }] },
			{ mode: "replace", tasks: [{ id: "a", title: "A" }, tasks[1]] },
			{ mode: "replace", tasks: [tasks[1]] },
		]) {
			const result = await call("set_goal_tasks", { ...params, expected_work_revision });
			assert.match(result.content[0].text, /scope revision|completed task/);
			assert.equal(readFileSync(path.join(f.cwd, f.goal.activePath!), "utf8"), before);
		}
		const unchanged = await call("set_goal_tasks", { expected_work_revision, tasks: [{ ...tasks[0], title: "  A  ", verification_contract: " Observe A " }, tasks[1]] });
		assert.equal(unchanged.details.goal.taskList.tasks[0].status, "complete");
		assert.equal(unchanged.details.goal.taskList.tasks[0].evidence, "Observed A");
		assert.equal(unchanged.details.goal.taskList.tasks[0].completedAt, complete.details.goal.taskList.tasks[0].completedAt);
	} finally { f.cleanup(); }
});

test("flat input converts to the same recursive tree", () => {
	const result = convertFlatTasks([
		{ id: "a", title: "A" },
		{ id: "b", title: "B", parent_id: "a" },
		{ id: "c", title: "C", parent_id: "a" },
		{ id: "d", title: "D", parent_id: "b" },
	], { maxSubtaskDepth: 2 });
	assert.ok(result.ok, result.ok ? "ok" : (result as { message: string }).message);
	if (!result.ok) return;
	assert.equal(result.tasks.length, 1);
	const a = result.tasks[0]!;
	assert.equal(a.id, "a");
	assert.deepEqual(a.subtasks?.map((t) => t.id), ["b", "c"]);
	assert.deepEqual(a.subtasks?.[0]?.subtasks?.map((t) => t.id), ["d"]);
});

test("flat conversion rejects duplicate ids, missing titles, and missing parents", () => {
	assert.equal(convertFlatTasks([{ id: "a", title: "A" }, { id: "a", title: "A2" }]).ok, false);
	assert.equal(convertFlatTasks([{ id: "", title: "X" }]).ok, false);
	assert.equal(convertFlatTasks([{ id: "a", title: "" }]).ok, false);
	assert.equal(convertFlatTasks([{ id: "a", title: "A", parent_id: "ghost" }]).ok, false);
	assert.equal(convertFlatTasks([{ id: "a", title: "A", status: "complete" } as FlatTaskInput]).ok, false, "structural input never accepts progress");
	assert.equal(convertFlatTasks([{ id: "a", title: "A", lightweight_subtasks: "yes" } as unknown as FlatTaskInput]).ok, false);
});

test("flat conversion rejects cyclic parent relationships", () => {
	const cyclic = convertFlatTasks([
		{ id: "a", title: "A", parent_id: "b" },
		{ id: "b", title: "B", parent_id: "a" },
	]);
	assert.equal(cyclic.ok, false);
	assert.ok((cyclic as { message: string }).message.includes("Cyclic"));
});

test("flat conversion enforces the 200-node replacement / 50-entry upsert caps, depth, and lightweight placement", () => {
	const many = Array.from({ length: 201 }, (_, i) => ({ id: `t${i}`, title: `T${i}` }));
	assert.equal(convertFlatTasks(many).ok, false);
	assert.equal(convertFlatTasks(many.slice(0, 200)).ok, true);
	assert.equal(convertFlatTasks(many.slice(0, 51), { mode: "upsert" }).ok, false);
	const deep = convertFlatTasks([
		{ id: "a", title: "A" },
		{ id: "b", title: "B", parent_id: "a" },
		{ id: "c", title: "C", parent_id: "b" },
	], { maxSubtaskDepth: 1 });
	assert.equal(deep.ok, false, "depth beyond configured maximum must reject");
	const lwLeaf = convertFlatTasks([{ id: "a", title: "A", lightweight_subtasks: true }]);
	assert.equal(lwLeaf.ok, false, "lightweight_subtasks without children must reject");
	const lwOk = convertFlatTasks([
		{ id: "a", title: "A", lightweight_subtasks: true },
		{ id: "b", title: "B", parent_id: "a" },
	]);
	assert.equal(lwOk.ok, true);
});

test("mergeTasksWithExisting preserves status and evidence for matching ids", () => {
	const existing = [{
		id: "a", title: "Old A", status: "complete" as const, evidence: "verified", completedAt: "2026-01-01T00:00:00.000Z",
		subtasks: [{ id: "a1", title: "A1 done", status: "complete" as const, evidence: "yep" }],
	}];
	const incoming = convertFlatTasks([
		{ id: "a", title: "New A title" },
		{ id: "a1", title: "A1 renamed", parent_id: "a" },
		{ id: "b", title: "Brand new B" },
	]);
	assert.ok(incoming.ok);
	if (!incoming.ok) return;
	const merged = mergeTasksWithExisting(existing, incoming.tasks);
	assert.equal(merged[0]!.status, "complete", "matching id keeps its status");
	assert.equal(merged[0]!.evidence, "verified", "matching id keeps its evidence");
	assert.equal(merged[0]!.title, "New A title", "title updates from input");
	assert.equal(merged[0]!.subtasks?.[0]?.status, "complete", "matching child keeps its status");
	assert.equal(merged.find((t) => t.id === "b")?.status, "pending", "new id starts pending");
});

// ── Tool execution harness ───────────────────────────────────────────────────

function createHarness(cwd: string, sessionEntries: unknown[]) {
	const handlers = new Map<string, Function>();
	const tools = new Map<string, ToolDefinition>();
	let activeTools = ["read", "bash", "edit", "write"];
	const pi = {
		registerTool: (def: ToolDefinition) => { tools.set(def.name, def); },
		registerCommand: () => {},
		on: (event: string, handler: Function) => { handlers.set(event, handler); },
		appendEntry: () => {},
		registerMessageRenderer: () => {},
		sendMessage: () => {},
		getActiveTools: () => [...activeTools],
		setActiveTools: (names: string[]) => { activeTools = [...names]; },
		hasUI: false,
	};
	const ctx = {
		cwd,
		hasUI: false,
		sessionManager: {
			getBranch: () => sessionEntries,
			getCwd: () => cwd,
			getSessionId: () => "task-tools-session",
			getRoot: () => cwd,
		},
		ui: {
			notify: () => {},
			setStatus: () => {},
			setWidget: () => {},
			onTerminalInput: () => () => {},
			select: async () => undefined,
			confirm: async () => false,
			custom: async () => undefined,
		},
		getSystemPrompt: () => "base",
		isIdle: () => true,
		hasPendingMessages: () => false,
		abort: () => {},
	} as unknown as ExtensionContext;
	goalExtension(pi as any, {});
	return { handlers, tools, ctx };
}

function fixtureWithTasks(tasks: Array<Record<string, unknown>>) {
	const cwd = mkdtempSync(path.join(tmpdir(), "goal-task-"));
	mkdirSync(path.join(cwd, ".pi", "goals", "archived"), { recursive: true });
	const goal = createGoal({ objective: "Task tool goal", autoContinue: true, sisyphus: false }, Date.UTC(2026, 7, 5, 9, 0, 0));
	goal.taskList = { tasks: tasks as any, blockCompletion: false, proposedAt: new Date().toISOString() };
	const written = writeActiveGoalFile({ cwd }, goal);
	const sessionEntries = [{ type: "custom", customType: "pi-goal-focus", data: goalFocusDetails(goal.id, "created") }];
	const cleanup = () => { try { rmSync(cwd, { recursive: true, force: true }); } catch {} };
	return { cwd, goal: written, sessionEntries, cleanup };
}

function activeGoal(cwd: string) {
	const files = readdirSync(path.join(cwd, ".pi", "goals")).filter((n) => n.startsWith("active_goal_"));
	return parseGoalFile(path.join(cwd, ".pi", "goals", files[0]!));
}

function ledgerEvents(cwd: string): Array<Record<string, unknown>> {
	try {
		return readFileSync(goalLedgerPath({ cwd }), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as Record<string, unknown>);
	} catch {
		return [];
	}
}

test("set_goal_tasks sets a structural task tree (headless auto-confirm)", async () => {
	const f = fixtureWithTasks([]);
	try {
		const h = createHarness(f.cwd, f.sessionEntries);
		await h.handlers.get("session_start")?.({ reason: "start" }, h.ctx);
		await h.handlers.get("before_agent_start")?.({ systemPrompt: "base", prompt: "go", systemPromptOptions: {} }, h.ctx);
		const tool = h.tools.get("set_goal_tasks")!;
		const result = await (tool.execute as any)("set-1", { expected_work_revision: await readWorkRevision(h),
			tasks: [
				{ id: "t1", title: "Task one" },
				{ id: "t2", title: "Task two", parent_id: "t1" },
			],
			block_completion: true,
		}, undefined, undefined, h.ctx);
		assert.ok(result.terminate === true, "structural change terminates the turn");
		const goal = activeGoal(f.cwd);
		assert.ok(goal?.taskList, "task list persisted");
		assert.equal(goal!.taskList!.tasks.length, 1, "root task");
		assert.equal(goal!.taskList!.tasks[0]!.id, "t1");
		assert.equal(goal!.taskList!.tasks[0]!.subtasks?.[0]?.id, "t2");
		assert.equal(goal!.taskList!.blockCompletion, true);
		assert.ok(ledgerEvents(f.cwd).some((e) => e.type === "task_list_set"), "task_list_set ledger event");
	} finally {
		f.cleanup();
	}
});

test("update_goal_task(complete) marks a task complete with evidence and ledger", async () => {
	const f = fixtureWithTasks([{ id: "t1", title: "Task one", status: "pending" }]);
	try {
		const h = createHarness(f.cwd, f.sessionEntries);
		await h.handlers.get("session_start")?.({ reason: "start" }, h.ctx);
		await h.handlers.get("before_agent_start")?.({ systemPrompt: "base", prompt: "go", systemPromptOptions: {} }, h.ctx);
		const tool = h.tools.get("update_goal_task")!;
		const evidence = "verified 🧭\n".repeat(500).trim();
		const result = await (tool.execute as any)("upd-1", { expected_work_revision: await readWorkRevision(h), task_id: "t1", status: "complete", evidence }, undefined, undefined, h.ctx);
		assert.equal(result.terminate, undefined, "task update does not terminate the turn");
		const goal = activeGoal(f.cwd);
		assert.equal(goal?.taskList?.tasks[0]?.status, "complete");
		assert.equal(goal?.taskList?.tasks[0]?.evidence, evidence);
		assert.ok(ledgerEvents(f.cwd).some((e) => e.type === "task_complete"), "task_complete ledger event");
	} finally {
		f.cleanup();
	}
});

test("update_goal_task(complete) requires evidence for contracted tasks", async () => {
	const f = fixtureWithTasks([{ id: "t1", title: "Task one", status: "pending", verificationContract: "Run the check." }]);
	try {
		const h = createHarness(f.cwd, f.sessionEntries);
		await h.handlers.get("session_start")?.({ reason: "start" }, h.ctx);
		await h.handlers.get("before_agent_start")?.({ systemPrompt: "base", prompt: "go", systemPromptOptions: {} }, h.ctx);
		const tool = h.tools.get("update_goal_task")!;
		const result = await (tool.execute as any)("upd-2", { expected_work_revision: await readWorkRevision(h), task_id: "t1", status: "complete" }, undefined, undefined, h.ctx);
		const text = result.content?.[0]?.text ?? "";
		assert.ok(text.includes("verification contract"), `evidence required for contracted task, got: ${text}`);
		const goal = activeGoal(f.cwd);
		assert.equal(goal?.taskList?.tasks[0]?.status, "pending", "task unchanged");
	} finally {
		f.cleanup();
	}
});

test("update_goal_task(skipped) requires a reason and cascades to subtasks", async () => {
	const f = fixtureWithTasks([
		{ id: "t1", title: "Parent", status: "pending" },
		{ id: "t2", title: "Child", status: "pending", parent_id: "t1" },
	]);
	// Rebuild with subtasks nested properly.
	f.cleanup();
	const cwd = mkdtempSync(path.join(tmpdir(), "goal-task-skip-"));
	mkdirSync(path.join(cwd, ".pi", "goals", "archived"), { recursive: true });
	const goal = createGoal({ objective: "Skip test", autoContinue: true, sisyphus: false }, Date.UTC(2026, 7, 5, 10, 0, 0));
	goal.taskList = {
		tasks: [{
			id: "t1", title: "Parent", status: "pending",
			subtasks: [{ id: "t2", title: "Child", status: "pending" }],
		}],
		blockCompletion: false,
		proposedAt: new Date().toISOString(),
	};
	writeActiveGoalFile({ cwd }, goal);
	try {
		const h = createHarness(cwd, [{ type: "custom", customType: "pi-goal-focus", data: goalFocusDetails(goal.id, "created") }]);
		await h.handlers.get("session_start")?.({ reason: "start" }, h.ctx);
		await h.handlers.get("before_agent_start")?.({ systemPrompt: "base", prompt: "go", systemPromptOptions: {} }, h.ctx);
		const tool = h.tools.get("update_goal_task")!;
		const noReason = await (tool.execute as any)("upd-3", { expected_work_revision: await readWorkRevision(h), task_id: "t1", status: "skipped" }, undefined, undefined, h.ctx);
		assert.ok((noReason.content?.[0]?.text ?? "").includes("requires a non-empty reason"));
		const ok = await (tool.execute as any)("upd-4", { expected_work_revision: await readWorkRevision(h), task_id: "t1", status: "skipped", reason: "user direction" }, undefined, undefined, h.ctx);
		assert.ok((ok.content?.[0]?.text ?? "").includes("skipped"));
		const files = readdirSync(path.join(cwd, ".pi", "goals")).filter((n) => n.startsWith("active_goal_"));
		const parsed = parseGoalFile(path.join(cwd, ".pi", "goals", files[0]!));
		assert.equal(parsed?.taskList?.tasks[0]?.status, "skipped", "parent skipped");
		assert.equal(parsed?.taskList?.tasks[0]?.subtasks?.[0]?.status, "skipped", "subtask cascaded");
		assert.ok(ledgerEvents(cwd).some((e) => e.type === "task_skipped"));
	} finally {
		try { rmSync(cwd, { recursive: true, force: true }); } catch {}
	}
});

test("update_goal_task(pending) reopens a skipped task; completed tasks are immutable", async () => {
	const cwd = mkdtempSync(path.join(tmpdir(), "goal-task-pending-"));
	mkdirSync(path.join(cwd, ".pi", "goals", "archived"), { recursive: true });
	const goal = createGoal({ objective: "Reopen test", autoContinue: true, sisyphus: false }, Date.UTC(2026, 7, 5, 11, 0, 0));
	goal.taskList = {
		tasks: [
			{ id: "sk", title: "Skipped", status: "skipped", skipReason: "later", skippedAt: new Date().toISOString() },
			{ id: "done", title: "Done", status: "complete", evidence: "y", completedAt: new Date().toISOString() },
		],
		blockCompletion: false,
		proposedAt: new Date().toISOString(),
	};
	writeActiveGoalFile({ cwd }, goal);
	try {
		const h = createHarness(cwd, [{ type: "custom", customType: "pi-goal-focus", data: goalFocusDetails(goal.id, "created") }]);
		await h.handlers.get("session_start")?.({ reason: "start" }, h.ctx);
		await h.handlers.get("before_agent_start")?.({ systemPrompt: "base", prompt: "go", systemPromptOptions: {} }, h.ctx);
		const tool = h.tools.get("update_goal_task")!;
		const reopen = await (tool.execute as any)("upd-5", { expected_work_revision: await readWorkRevision(h), task_id: "sk", status: "pending" }, undefined, undefined, h.ctx);
		assert.ok((reopen.content?.[0]?.text ?? "").includes("reopened"));
		const immutable = await (tool.execute as any)("upd-6", { expected_work_revision: await readWorkRevision(h), task_id: "done", status: "pending" }, undefined, undefined, h.ctx);
		assert.ok((immutable.content?.[0]?.text ?? "").includes("cannot be reopened"));
		const files = readdirSync(path.join(cwd, ".pi", "goals")).filter((n) => n.startsWith("active_goal_"));
		const parsed = parseGoalFile(path.join(cwd, ".pi", "goals", files[0]!));
		const byId = new Map(parsed!.taskList!.tasks.map((t) => [t.id, t]));
		assert.equal(byId.get("sk")?.status, "pending", "skipped task reopened");
		assert.equal(byId.get("done")?.status, "complete", "completed task immutable");
	} finally {
		try { rmSync(cwd, { recursive: true, force: true }); } catch {}
	}
});

// ── Stage 3 hardening: structural merge semantics ───────────────────────────

test("mergeTasksWithExisting: structural omission clears contract, flag, and children while progress survives", () => {
	const existing: GoalTask[] = [{
		id: "a", title: "Old A", status: "complete" as const, evidence: "verified",
		completedAt: "2026-01-01T00:00:00.000Z",
		verificationContract: "Must verify A",
		lightweightSubtasks: true,
		subtasks: [
			{ id: "a1", title: "Child", status: "complete" as const, evidence: "child-evidence", completedAt: "2026-01-01T00:00:00.000Z" },
			{ id: "a2", title: "Child2", status: "pending" },
		],
	}];
	const incoming = convertFlatTasks([
		// a omits verification_contract, lightweight_subtasks, and children.
		{ id: "a", title: "A restructured" },
	]);
	assert.ok(incoming.ok);
	if (!incoming.ok) return;
	const merged = mergeTasksWithExisting(existing, incoming.tasks);
	const a = merged[0]!;
	assert.equal(a.status, "complete", "matching id keeps its runtime status");
	assert.equal(a.evidence, "verified", "matching id keeps its evidence");
	assert.equal(a.completedAt, "2026-01-01T00:00:00.000Z", "matching id keeps its completion timestamp");
	assert.equal(a.title, "A restructured", "title is structural and authoritative");
	assert.equal(a.verificationContract, undefined, "omitted contract is cleared");
	assert.equal(a.lightweightSubtasks, undefined, "omitted lightweight flag is cleared");
	assert.equal(a.subtasks, undefined, "omitted children delete the subtree");
});

test("mergeTasksWithExisting: moving a task between parents relocates it with progress", () => {
	const existing: GoalTask[] = [{
		id: "a", title: "A", status: "pending",
		subtasks: [{ id: "a1", title: "A1", status: "complete" as const, evidence: "done-a1" }],
	}, {
		id: "b", title: "B", status: "pending",
	}];
	const incoming = convertFlatTasks([
		{ id: "a", title: "A" },
		{ id: "b", title: "B" },
		{ id: "a1", title: "A1 moved", parent_id: "b" },
	]);
	assert.ok(incoming.ok);
	if (!incoming.ok) return;
	const merged = mergeTasksWithExisting(existing, incoming.tasks);
	const b = merged.find((t) => t.id === "b")!;
	assert.equal(b.subtasks?.[0]?.id, "a1", "task moved under b");
	assert.equal(b.subtasks?.[0]?.status, "complete", "moved task keeps progress");
	assert.equal(b.subtasks?.[0]?.evidence, "done-a1", "moved task keeps evidence");
	assert.equal(merged.find((t) => t.id === "a")?.subtasks, undefined, "a no longer owns a1");
});

test("mergeTasksWithExisting: skipping state is preserved for matching ids", () => {
	const existing: GoalTask[] = [{
		id: "s", title: "Old S", status: "skipped" as const,
		skipReason: "user direction", skippedAt: "2026-01-02T00:00:00.000Z",
	}];
	const incoming = convertFlatTasks([{ id: "s", title: "New S title" }]);
	assert.ok(incoming.ok);
	if (!incoming.ok) return;
	const merged = mergeTasksWithExisting(existing, incoming.tasks);
	assert.equal(merged[0]!.status, "skipped");
	assert.equal(merged[0]!.skipReason, "user direction");
	assert.equal(merged[0]!.skippedAt, "2026-01-02T00:00:00.000Z");
	assert.equal(merged[0]!.title, "New S title");
});

test("countTasks counts every node including descendants", () => {
	const tree = [
		{ id: "a", title: "A", status: "pending" as const, subtasks: [
			{ id: "a1", title: "A1", status: "pending" as const, subtasks: [
				{ id: "a1x", title: "A1x", status: "pending" as const },
			] },
		] },
		{ id: "b", title: "B", status: "pending" as const },
	];
	assert.equal(countTasks(tree), 4, "3 nested under a plus b");
	assert.equal(countTasks([{ id: "c", title: "C", status: "pending" as const }]), 1);
	assert.equal(countTasks(undefined), 0);
});

// ── Stage 3 hardening: disk-fresh transactions ──────────────────────────────

test("set_goal_tasks preserves an external disk edit made between confirmation and apply", async () => {
	// Session starts with t1/t2 pending. An external edit marks t2 complete on
	// disk. set_goal_tasks then replaces the tree (headless auto-confirm). The
	// disk-fresh merge must preserve the external t2 progress.
	const f = fixtureWithTasks([{ id: "t1", title: "T1", status: "pending" }, { id: "t2", title: "T2", status: "pending" }]);
	try {
		const h = createHarness(f.cwd, f.sessionEntries);
		await h.handlers.get("session_start")?.({ reason: "start" }, h.ctx);
		await h.handlers.get("before_agent_start")?.({ systemPrompt: "base", prompt: "go", systemPromptOptions: {} }, h.ctx);

		// External edit: mark t2 complete directly on disk.
		const files = readdirSync(path.join(f.cwd, ".pi", "goals")).filter((n) => n.startsWith("active_goal_"));
		const path0 = path.join(f.cwd, ".pi", "goals", files[0]!);
		const diskGoal = parseGoalFile(path0)!;
		diskGoal.taskList!.tasks = diskGoal.taskList!.tasks.map((t) =>
			t.id === "t2" ? { ...t, status: "complete" as const, evidence: "external", completedAt: new Date().toISOString() } : t);
		writeActiveGoalFile({ cwd: f.cwd }, diskGoal);

		const tool = h.tools.get("set_goal_tasks")!;
		await (tool.execute as any)("set-ext", { expected_work_revision: await readWorkRevision(h),
			tasks: [{ id: "t1", title: "T1" }, { id: "t2", title: "T2" }],
		}, undefined, undefined, h.ctx);

		const goal = activeGoal(f.cwd);
		const byId = new Map(goal!.taskList!.tasks.map((t) => [t.id, t]));
		assert.equal(byId.get("t2")?.status, "complete", "external progress preserved by the disk-fresh merge");
		assert.equal(byId.get("t2")?.evidence, "external", "external evidence preserved");
		assert.equal(byId.get("t1")?.status, "pending", "unchanged task stays pending");
		const event = ledgerEvents(f.cwd).find((e) => e.type === "task_list_set") as Record<string, unknown> | undefined;
		assert.ok(event, "task_list_set recorded");
		assert.equal(event!.taskCount, 2, "taskCount counts all nodes");
	} finally {
		f.cleanup();
	}
});

test("update_goal_task updates only the requested path and preserves concurrent disk tasks", async () => {
	const f = fixtureWithTasks([{ id: "t1", title: "T1", status: "pending" }]);
	try {
		const h = createHarness(f.cwd, f.sessionEntries);
		await h.handlers.get("session_start")?.({ reason: "start" }, h.ctx);
		await h.handlers.get("before_agent_start")?.({ systemPrompt: "base", prompt: "go", systemPromptOptions: {} }, h.ctx);

		// Concurrent external edit: add a brand-new task to the disk tree.
		const files = readdirSync(path.join(f.cwd, ".pi", "goals")).filter((n) => n.startsWith("active_goal_"));
		const path0 = path.join(f.cwd, ".pi", "goals", files[0]!);
		const diskGoal = parseGoalFile(path0)!;
		diskGoal.taskList!.tasks = [
			...diskGoal.taskList!.tasks,
			{ id: "ext", title: "External task", status: "pending" },
		];
		writeActiveGoalFile({ cwd: f.cwd }, diskGoal);

		const tool = h.tools.get("update_goal_task")!;
		await (tool.execute as any)("upd-ext", { expected_work_revision: await readWorkRevision(h), task_id: "t1", status: "complete", evidence: "verified" }, undefined, undefined, h.ctx);

		const goal = activeGoal(f.cwd);
		const byId = new Map(goal!.taskList!.tasks.map((t) => [t.id, t]));
		assert.equal(byId.get("t1")?.status, "complete", "requested task updated");
		assert.equal(byId.get("ext")?.status, "pending", "concurrent disk task preserved");
		assert.equal(byId.get("ext")?.id, "ext", "concurrent disk task still present");
	} finally {
		f.cleanup();
	}
});

test("update_goal_task returns a typed failure for a task removed on disk", async () => {
	const f = fixtureWithTasks([{ id: "t1", title: "T1", status: "pending" }]);
	try {
		const h = createHarness(f.cwd, f.sessionEntries);
		await h.handlers.get("session_start")?.({ reason: "start" }, h.ctx);
		await h.handlers.get("before_agent_start")?.({ systemPrompt: "base", prompt: "go", systemPromptOptions: {} }, h.ctx);

		// External edit removes t1 from disk (leaving another task so the list exists).
		const files = readdirSync(path.join(f.cwd, ".pi", "goals")).filter((n) => n.startsWith("active_goal_"));
		const path0 = path.join(f.cwd, ".pi", "goals", files[0]!);
		const diskGoal = parseGoalFile(path0)!;
		diskGoal.taskList!.tasks = [{ id: "other", title: "Other", status: "pending" }];
		writeActiveGoalFile({ cwd: f.cwd }, diskGoal);

		const tool = h.tools.get("update_goal_task")!;
		const result = await (tool.execute as any)("upd-gone", { expected_work_revision: await readWorkRevision(h), task_id: "t1", status: "complete", evidence: "x" }, undefined, undefined, h.ctx);
		const text = result.content?.[0]?.text ?? "";
		assert.ok(text.includes("not found"), `removed task must return a typed failure, got: ${text}`);
	} finally {
		f.cleanup();
	}
});

test("set_goal_tasks never creates per-goal auditor bypass state", async () => {
	const f = fixtureWithTasks([]);
	try {
		const h = createHarness(f.cwd, f.sessionEntries);
		await h.handlers.get("session_start")?.({ reason: "start" }, h.ctx);
		await h.handlers.get("before_agent_start")?.({ systemPrompt: "base", prompt: "go", systemPromptOptions: {} }, h.ctx);
		const tool = h.tools.get("set_goal_tasks")!;
		await (tool.execute as any)("set-nya", { expected_work_revision: await readWorkRevision(h),
			tasks: [{ id: "t1", title: "T1" }],
		}, undefined, undefined, h.ctx);
		const goal = activeGoal(f.cwd);
		assert.equal(goal?.skipAuditor, undefined, "task confirmation must not create skipAuditor bypass state");
		const diskContent = readFileSync(path.join(f.cwd, ".pi", "goals",
			readdirSync(path.join(f.cwd, ".pi", "goals")).filter((n) => n.startsWith("active_goal_"))[0]!), "utf8");
		assert.ok(!diskContent.includes("skipAuditor"), "skipAuditor must not be written by set_goal_tasks");
	} finally {
		f.cleanup();
	}
});

test("update_goal_task(pending) writes a task_reopened ledger event", async () => {
	const cwd = mkdtempSync(path.join(tmpdir(), "goal-task-reopen-ev-"));
	mkdirSync(path.join(cwd, ".pi", "goals", "archived"), { recursive: true });
	const goal = createGoal({ objective: "Reopen event", autoContinue: true, sisyphus: false }, Date.UTC(2026, 7, 5, 12, 0, 0));
	goal.taskList = {
		tasks: [{ id: "sk", title: "Skipped", status: "skipped", skipReason: "later", skippedAt: new Date().toISOString() }],
		blockCompletion: false,
		proposedAt: new Date().toISOString(),
	};
	writeActiveGoalFile({ cwd }, goal);
	try {
		const h = createHarness(cwd, [{ type: "custom", customType: "pi-goal-focus", data: goalFocusDetails(goal.id, "created") }]);
		await h.handlers.get("session_start")?.({ reason: "start" }, h.ctx);
		await h.handlers.get("before_agent_start")?.({ systemPrompt: "base", prompt: "go", systemPromptOptions: {} }, h.ctx);
		const tool = h.tools.get("update_goal_task")!;
		await (tool.execute as any)("upd-r", { expected_work_revision: await readWorkRevision(h), task_id: "sk", status: "pending" }, undefined, undefined, h.ctx);
		const events = ledgerEvents(cwd);
		const reopened = events.find((e) => e.type === "task_reopened") as Record<string, unknown> | undefined;
		assert.ok(reopened, "task_reopened ledger event must be written");
		assert.equal(reopened!.taskId, "sk");
	} finally {
		try { rmSync(cwd, { recursive: true, force: true }); } catch {}
	}
});
