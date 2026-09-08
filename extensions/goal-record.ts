import { createHash } from "node:crypto";
import { retainedGoalScope } from "./goal-scope.ts";

export type GoalStatus = "active" | "paused" | "blocked" | "budget_limited" | "complete";
export type StopReason = "user" | "agent";
export type GoalEventKind = "checkpoint" | "stale";
/** Goal creation mode used by the /goal and /sisyphus commands. */
export type GoalMode = "goal" | "sisyphus";
export type GoalFocusReason = "created" | "selected" | "unfocused" | "resumed" | "completed" | "cleared" | "aborted" | "migrated" | "navigated";

export type TaskStatus = "pending" | "complete" | "skipped";

export interface GoalTask {
  id: string;
  title: string;
  status: TaskStatus;
  completedAt?: string;
  skippedAt?: string;
  evidence?: string;
  skipReason?: string;
  verificationContract?: string;
  lightweightSubtasks?: boolean;
  subtasks?: GoalTask[];
}

export interface GoalTaskList {
  tasks: GoalTask[];
  blockCompletion: boolean;
  proposedAt: string;
}

export interface GoalUsage {
	tokensUsed: number;
	activeSeconds: number;
}

export type GoalRetainedTask = Pick<GoalTask, "title" | "status" | "evidence" | "completedAt"> & { verificationContract: string };
export interface GoalScopeChangeReceipt {
	priorText: string;
	newText: string;
	reason: string;
	confirmationLocator: string;
	confirmedAt: string;
}
export interface GoalRetainedScope {
	objective: string;
	verificationContract?: string;
	tasks: Record<string, GoalRetainedTask>;
	changes: GoalScopeChangeReceipt[];
}

export interface GoalRecord {
	id: string;
	objective: string;
	status: GoalStatus;
	autoContinue: boolean;
	usage: GoalUsage;
	sisyphus: boolean;
	createdAt: string;
	updatedAt: string;
	activePath?: string;
	archivedPath?: string;
	stopReason?: StopReason;
	// Set when the model reports the goal blocked. Cleared when the goal becomes active again.
	pauseReason?: string;
	pauseSuggestedAction?: string;
	skipAuditor?: boolean;
	/**
	 * Persisted monotonic mutation counter (follow-up Stage 4). Missing
	 * historical values normalize to zero. Cross-process writers compare the
	 * revision captured at reconciliation with the disk value under the
	 * per-goal lock; a mismatch is a typed conflict instead of a blind write.
	 */
	revision?: number;
	/** Optional token budget (whole tokens). When accounted usage reaches it, the runtime marks the goal budget_limited. */
	tokenBudget?: number;
	/**
	 * Execution focus: the id of the task (or subtask) the agent is working on.
	 * Optional for backward compatibility; normalized at load (only an existing
	 * pending task id is accepted; cleared on complete/skip/removal). Describes
	 * execution focus, not completion state — TaskStatus is unchanged.
	 */
	currentTaskId?: string;
	taskList?: GoalTaskList;
	/** Plain-text description of what verification evidence is required before completing this goal. */
	verificationContract?: string;
	/** Approved requirements survive changes to the planning tree. Absent in legacy files. */
	retainedScope?: GoalRetainedScope;
}

export interface GoalStateEntry {
	version: 3;
	goal: GoalRecord | null;
	work_revision?: string;
	/** E7: expandable tool-result detail line (e.g. full pause reason). */
	resultDetail?: string;
}

export interface GoalFocusEntry {
	version: 1;
	focusedGoalId: string | null;
	reason: GoalFocusReason;
}

/**
 * Issue #30 v2 checkpoint details: a tiny structured trigger record. Never
 * contains objective text, task text, verification contracts, budget strings,
 * or policy text — the authoritative state is injected once per turn by
 * before_agent_start from goal storage.
 */
export interface GoalCheckpointDetailsV2 {
	version: 2;
	kind: "checkpoint";
	goalId: string;
	status: "active";
	revision: number;
	checkpointSeq: number;
	timestamp: number;
}

/** Pre-v2 event details (full objective persisted). Read-only legacy shape. */
export interface LegacyGoalEventDetails {
	kind: GoalEventKind;
	goalId: string;
	status?: GoalStatus;
	objective?: string;
	timestamp?: number;
	currentGoalId?: string | null;
	currentStatus?: GoalStatus | null;
	/** Legacy-read-only creation mode on historical event entries; no writer emits it today. */
	focus?: GoalMode;
}

/** Historical "stale" rewrite of a checkpoint that no longer matches the goal. */
export interface GoalStaleDetails {
	kind: "stale";
	goalId: string;
	currentGoalId?: string | null;
	currentStatus?: GoalStatus | null;
}

/** Everything that can appear in a persisted pi-goal-event entry's details. */
export type GoalEventEntryDetails = GoalCheckpointDetailsV2 | LegacyGoalEventDetails | GoalStaleDetails;

/**
 * Legacy normalized renderer shape. Kept as the stable contract for
 * renderGoalEvent / registerMessageRenderer; v2 entries normalize into it.
 */
export type GoalEventDetails = LegacyGoalEventDetails;

export interface GoalCreationConfig {
	objective: string;
	autoContinue: boolean;
	sisyphus: boolean;
	taskList?: GoalTaskList;
	/** User-chosen per-draft auditor bypass, persisted on the created goal. */
	skipAuditor?: boolean;
}

export interface AssistantUsage {
	input?: number;
	output?: number;
}

export interface AssistantMessageLike {
	role?: string;
	stopReason?: string;
	usage?: AssistantUsage;
}

export function nowIso(now = Date.now()): string {
	return new Date(now).toISOString();
}

export function safeIdPart(value: string): string {
	return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "goal";
}

export function newGoalId(): string {
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeRelPath(relPath: string): string {
	return relPath.split(/[\\/]+/).join("/");
}

export function asRecord(value: unknown): Record<string, unknown> | null {
	return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

export function emptyUsage(): GoalUsage {
	return { tokensUsed: 0, activeSeconds: 0 };
}

function cloneGoalTask(task: GoalTask): GoalTask {
	return {
		...task,
		subtasks: task.subtasks ? task.subtasks.map(cloneGoalTask) : undefined,
	};
}

export function cloneGoal(goal: GoalRecord): GoalRecord {
	return {
		...goal,
		usage: { ...goal.usage },
		retainedScope: goal.retainedScope ? structuredClone(goal.retainedScope) : undefined,
		taskList: goal.taskList
			? { ...goal.taskList, tasks: goal.taskList.tasks.map(cloneGoalTask) }
			: undefined,
	};
}

/** Content identity for work. Accounting and wall-clock fields never invalidate it. */
export function goalWorkRevision(goal: GoalRecord): string {
	const scope = retainedGoalScope(goal);
	const tasks = (list: GoalTask[]): unknown[] => list.map(task => [
		task.id, task.title, task.verificationContract ?? "", task.status,
		task.evidence ?? "", task.skipReason ?? "", task.lightweightSubtasks === true,
		tasks(task.subtasks ?? []),
	]);
	return createHash("sha256").update(JSON.stringify([
		goal.id, goal.objective, goal.verificationContract ?? "",
		[scope.objective, scope.verificationContract ?? "", Object.keys(scope.tasks).sort().map(id => { const task = scope.tasks[id]!; return [id, task.title, task.verificationContract, task.status, task.evidence ?? ""]; }),
			scope.changes.map(change => [change.priorText, change.newText, change.reason, change.confirmationLocator])],
		goal.taskList ? [goal.taskList.blockCompletion, tasks(goal.taskList.tasks)] : null,
		goal.currentTaskId ?? null,
	])).digest("hex");
}

/** undefined skips the check for non-task callers; null represents a required missing value. */
export function workRevisionError(goal: GoalRecord, expected: string | null | undefined): string | undefined {
	if (expected === undefined) return;
	const current = goalWorkRevision(goal);
	if (expected !== current) return `Missing or stale expected_work_revision; current work_revision: ${current}. Call get_goal and retry against the current work.`;
}

export function goalFocusDetails(focusedGoalId: string | null, reason: GoalFocusReason): GoalFocusEntry {
	return {
		version: 1,
		focusedGoalId: focusedGoalId ? safeIdPart(focusedGoalId) : null,
		reason,
	};
}

export function normalizeGoalFocusEntry(value: unknown): GoalFocusEntry | null {
	const raw = asRecord(value);
	if (!raw || raw.version !== 1) return null;
	const focusedGoalId = typeof raw.focusedGoalId === "string" && raw.focusedGoalId.trim()
		? safeIdPart(raw.focusedGoalId)
		: null;
	const reason: GoalFocusReason =
		raw.reason === "created" || raw.reason === "selected" || raw.reason === "unfocused" || raw.reason === "resumed" || raw.reason === "completed" || raw.reason === "cleared" || raw.reason === "aborted" || raw.reason === "migrated" || raw.reason === "navigated"
			? raw.reason
			: "selected";
	return { version: 1, focusedGoalId, reason };
}

export function createGoal(config: GoalCreationConfig, now = Date.now()): GoalRecord {
	const timestamp = nowIso(now);
	return {
		id: newGoalId(),
		objective: config.objective,
		status: "active",
		autoContinue: config.autoContinue,
		usage: emptyUsage(),
		sisyphus: config.sisyphus,
		skipAuditor: config.skipAuditor === true ? true : undefined,
		revision: 0,
		createdAt: timestamp,
		updatedAt: timestamp,
	};
}

export function normalizeUsage(value: unknown): GoalUsage {
	const raw = asRecord(value);
	if (!raw) return emptyUsage();
	const tokensUsed = typeof raw.tokensUsed === "number" && Number.isFinite(raw.tokensUsed) ? Math.max(0, Math.floor(raw.tokensUsed)) : 0;
	const activeSeconds = typeof raw.activeSeconds === "number" && Number.isFinite(raw.activeSeconds) ? Math.max(0, Math.floor(raw.activeSeconds)) : 0;
	return { tokensUsed, activeSeconds };
}

export function normalizeTaskItem(raw: Record<string, unknown>): GoalTask | undefined {
	const id = typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : "";
	const title = typeof raw.title === "string" ? raw.title.trim() : "";
	if (!id || !title) return undefined;
	const status: TaskStatus = raw.status === "complete" ? "complete" : raw.status === "skipped" ? "skipped" : "pending";
	const subtasksRaw = raw.subtasks;
	let subtasks: GoalTask[] | undefined;
	if (Array.isArray(subtasksRaw)) {
		subtasks = subtasksRaw
			.map((item) => (item && typeof item === "object" ? normalizeTaskItem(item as Record<string, unknown>) : undefined))
			.filter((t): t is GoalTask => !!t);
		if (subtasks.length === 0) subtasks = undefined;
	}
	return {
		id,
		title,
		status,
		completedAt: typeof raw.completedAt === "string" ? raw.completedAt : undefined,
		skippedAt: typeof raw.skippedAt === "string" ? raw.skippedAt : undefined,
		evidence: typeof raw.evidence === "string" ? raw.evidence : undefined,
		skipReason: typeof raw.skipReason === "string" ? raw.skipReason : undefined,
		verificationContract: typeof raw.verificationContract === "string" ? raw.verificationContract : undefined,
		lightweightSubtasks: raw.lightweightSubtasks === true ? true : undefined,
		subtasks,
	};
}

export function normalizeTaskList(value: unknown): GoalTaskList | undefined {
	const raw = asRecord(value);
	if (!raw) return undefined;
	const tasksRaw = raw.tasks;
	if (!Array.isArray(tasksRaw)) return undefined;
	const tasks: GoalTask[] = tasksRaw
		.map((item) => (item && typeof item !== "object" || Array.isArray(item) ? undefined : normalizeTaskItem(item as Record<string, unknown>)))
		.filter((t): t is GoalTask => !!t);
	if (tasks.length === 0) return undefined;
	return {
		tasks,
		blockCompletion: raw.blockCompletion === true,
		proposedAt: typeof raw.proposedAt === "string" ? raw.proposedAt : nowIso(),
	};
}

/**
 * Shared positive-safe-integer normalization for persisted numeric values such
 * as tokenBudget. Non-finite, fractional, zero, negative, and unsafe numbers
 * normalize to absent rather than silently changing meaning. Live tool input
 * is validated separately (rejected with a user-facing message); this handles
 * persisted legacy values.
 */
/**
 * Live-input validation for token_budget (shared by slash-command parsing, tool
 * execution, and record creation). Tool callers are untrusted, so the schema
 * Type.Integer bound is double-checked at runtime with Number.isSafeInteger.
 */
export function validateTokenBudgetInput(value: unknown): { ok: true; value: number } | { ok: false; message: string } {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		return { ok: false, message: "token_budget must be a number." };
	}
	if (!Number.isSafeInteger(value)) {
		return { ok: false, message: "token_budget must be a whole safe integer (fractional values are not accepted)." };
	}
	if (value < 1) {
		return { ok: false, message: "token_budget must be at least 1." };
	}
	return { ok: true, value };
}

export function normalizePositiveSafeInteger(value: unknown): number | undefined {
	return typeof value === "number" && Number.isSafeInteger(value) && value >= 1 ? value : undefined;
}

/**
 * §7.4: a persisted currentTaskId is accepted only when it references an
 * existing PENDING task (top-level or nested). It is cleared when the task is
 * complete, skipped, or no longer exists; absent for historical files. The
 * caller decides whether to persist the normalized value — normalization
 * itself never rewrites old files.
 */
export function currentTaskIdIsPending(tasks: readonly GoalTask[] | undefined, id: string | undefined): boolean {
	if (!id || !tasks) return false;
	for (const t of tasks) {
		if (t.id === id) return t.status === "pending";
		if (t.subtasks && currentTaskIdIsPending(t.subtasks, id)) return true;
	}
	return false;
}

function normalizeRetainedScope(value: unknown): GoalRetainedScope | undefined {
	const raw = asRecord(value);
	const tasks = asRecord(raw?.tasks);
	if (!raw || typeof raw.objective !== "string" || !raw.objective.trim() || !tasks || !Array.isArray(raw.changes)
		|| (raw.verificationContract !== undefined && typeof raw.verificationContract !== "string")) return;
	const entries: Array<[string, GoalRetainedTask]> = [];
	for (const [id, value] of Object.entries(tasks)) {
		const task = asRecord(value);
		if (!id.trim() || !task || typeof task.title !== "string" || !task.title.trim()
			|| typeof task.verificationContract !== "string" || !task.verificationContract.trim()
			|| !["pending", "complete", "skipped"].includes(String(task.status))
			|| (task.evidence !== undefined && typeof task.evidence !== "string")
			|| (task.completedAt !== undefined && typeof task.completedAt !== "string")) return;
		entries.push([id, {title: task.title, verificationContract: task.verificationContract, status: task.status as TaskStatus,
			evidence: task.evidence as string | undefined, completedAt: task.completedAt as string | undefined}]);
	}
	const changes: GoalScopeChangeReceipt[] = [];
	for (const value of raw.changes) {
		const change = asRecord(value);
		if (!change || typeof change.priorText !== "string" || typeof change.newText !== "string"
			|| typeof change.reason !== "string" || !change.reason.trim()
			|| typeof change.confirmationLocator !== "string" || !change.confirmationLocator.trim()
			|| typeof change.confirmedAt !== "string" || !change.confirmedAt.trim()) return;
		changes.push({priorText: change.priorText, newText: change.newText, reason: change.reason, confirmationLocator: change.confirmationLocator, confirmedAt: change.confirmedAt});
	}
	return {objective: raw.objective, verificationContract: raw.verificationContract as string | undefined, tasks: Object.fromEntries(entries), changes};
}

export function normalizeGoalRecord(value: unknown): GoalRecord | null {
	const raw = asRecord(value);
	if (!raw) return null;
	const objective = typeof raw.objective === "string" ? raw.objective.trim() : "";
	if (!objective) return null;
	const retainedScope = normalizeRetainedScope(raw.retainedScope);
	if (raw.retainedScope !== undefined && !retainedScope) return null; // Invalid scope must never silently become a legacy goal.

	const timestamp = nowIso();
	// Persisted lifecycle status is authoritative. autoContinue is an execution
	// preference only: it must never rewrite status during reads or migration.
	const rawStatus = raw.status;
	const status: GoalStatus = rawStatus === "complete"
		? "complete"
		: rawStatus === "paused"
			? "paused"
			: rawStatus === "budget_limited"
				? "budget_limited"
				: rawStatus === "blocked"
					? "blocked"
					: "active";
	// autoContinue normalizes independently of status.
	const autoContinue = typeof raw.autoContinue === "boolean" ? raw.autoContinue : true;
	const usage = normalizeUsage(raw.usage);
	const sisyphus = raw.sisyphus === true;
	const taskList = normalizeTaskList(raw.taskList);
	// §7.4: accept a persisted currentTaskId only when it references an existing
	// pending task; otherwise leave it absent. Historical files stay absent and
	// are never rewritten just because the field is missing.
	const currentTaskId =
		typeof raw.currentTaskId === "string" && currentTaskIdIsPending(taskList?.tasks, raw.currentTaskId.trim())
			? raw.currentTaskId.trim()
			: undefined;

	return {
		id: typeof raw.id === "string" && raw.id ? safeIdPart(raw.id) : newGoalId(),
		objective,
		status,
		autoContinue,
		usage,
		sisyphus,
		createdAt: typeof raw.createdAt === "string" ? raw.createdAt : timestamp,
		updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : timestamp,
		activePath: typeof raw.activePath === "string" ? raw.activePath : undefined,
		archivedPath: typeof raw.archivedPath === "string" ? raw.archivedPath : undefined,
		stopReason: raw.stopReason === "agent" || raw.stopReason === "user" ? raw.stopReason : undefined,
		pauseReason: typeof raw.pauseReason === "string" && raw.pauseReason.trim() ? raw.pauseReason : undefined,
		pauseSuggestedAction: typeof raw.pauseSuggestedAction === "string" && raw.pauseSuggestedAction.trim() ? raw.pauseSuggestedAction : undefined,
		skipAuditor: raw.skipAuditor === true ? true : undefined,
		revision: Number.isSafeInteger(raw.revision) && (raw.revision as number) >= 0 ? (raw.revision as number) : 0,
		tokenBudget: normalizePositiveSafeInteger(raw.tokenBudget),
		taskList,
		currentTaskId,
		verificationContract: typeof raw.verificationContract === "string" ? raw.verificationContract : undefined,
		...(retainedScope ? {retainedScope} : {}),
	};
}
