import type { GoalTask } from "./goal-record.ts";

export interface TaskIndex {
 tasks: GoalTask[];
 byId: Map<string, GoalTask>;
 ordered: Array<{task: GoalTask; depth: number; parentId?: string}>;
 pending: GoalTask[];
 complete: number;
 skipped: number;
}
const cache = new Map<string, TaskIndex>();
/** Content keyed: usage-only changes reuse derivations; external edits cannot hit stale entries. */
export function taskIndex(tasks: readonly GoalTask[] = []): TaskIndex {
 const key = JSON.stringify(tasks);
 const hit = cache.get(key);
 if (hit) return hit;
 // Own the snapshot: a caller editing its input in-place must not corrupt an older cache entry.
 const snapshot = JSON.parse(key) as GoalTask[];
 const result: TaskIndex = {tasks: snapshot, byId: new Map(), ordered: [], pending: [], complete: 0, skipped: 0};
 const walk = (list: GoalTask[], depth: number, parentId?: string): void => {
  for (const task of list) {
   result.byId.set(task.id, task); result.ordered.push({task, depth, parentId});
   if (task.status === "pending") result.pending.push(task);
   else if (task.status === "complete") result.complete++;
   else result.skipped++;
   if (task.subtasks) walk(task.subtasks, depth + 1, task.id);
  }
 };
 walk(snapshot, 0);
 if (cache.size >= 32) cache.delete(cache.keys().next().value!);
 cache.set(key, result);
 return result;
}
