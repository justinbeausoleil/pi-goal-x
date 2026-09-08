import type { GoalRecord, GoalRetainedScope, GoalRetainedTask, GoalTask } from "./goal-record.ts";
import { taskIndex } from "./goal-task-index.ts";

function taskContracts(goal: GoalRecord): Record<string, GoalRetainedTask> {
	return Object.fromEntries(taskIndex(goal.taskList?.tasks).ordered
		.filter(({task}) => task.verificationContract?.trim())
		.map(({task}) => [task.id, {title: task.title, verificationContract: task.verificationContract!, status: task.status,
			evidence: task.evidence, completedAt: task.completedAt}]));
}

/** Legacy reads derive surviving requirements without rewriting the record. */
export function retainedGoalScope(goal: GoalRecord): GoalRetainedScope {
	return goal.retainedScope ?? {objective: goal.objective, verificationContract: goal.verificationContract, tasks: taskContracts(goal), changes: []};
}

/** Called only at the service mutation boundary; deletion cannot erase a prior snapshot. */
export function retainGoalScope(before: GoalRecord, after: GoalRecord = before): GoalRecord {
	const scope = retainedGoalScope(before);
	const tasks = new Map(Object.entries(scope.tasks));
	for (const goal of [before, after]) for (const [id, task] of Object.entries(taskContracts(goal))) {
		const prior = tasks.get(id);
		if (!prior || prior.verificationContract.trim() === task.verificationContract.trim()) tasks.set(id, {...task, verificationContract: prior?.verificationContract ?? task.verificationContract});
	}
	return {...after, retainedScope: {...scope, tasks: Object.fromEntries(tasks)}};
}

/** Planning flags and auditor bypass cannot supply missing required evidence. */
export function retainedScopeCompletionWarning(goal: GoalRecord): string | undefined {
	const unresolved = Object.entries(retainedGoalScope(goal).tasks).filter(([, task]) => task.status !== "complete" || !task.evidence?.trim());
	if (unresolved.length) return `Retained requirements remain unresolved: ${unresolved.map(([id]) => id).join(", ")}. Recreate removed tasks with their original IDs and contracts and supply evidence through update_goal_task, or request a human /goal-tweak scope revision. Read all requirements with get_goal(section="scope").`;
}

export function retainedTaskEvidenceError(goal: GoalRecord, task: GoalTask): string | undefined {
	const retained = goal.retainedScope?.tasks;
	const contract = task.verificationContract?.trim() || (retained && Object.hasOwn(retained, task.id) ? retained[task.id]!.verificationContract : undefined);
	if (contract && task.status === "complete" && !task.evidence?.trim()) return `Task "${task.id}" has a retained verification contract; provide evidence to complete it. Settings cannot waive retained requirements.`;
}
