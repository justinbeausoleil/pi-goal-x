import { createHash } from "node:crypto";
import type { GoalRecord, GoalTask } from "./goal-record.ts";
import type { GoalLedgerEvent } from "./goal-ledger.ts";

export const GOAL_DETAIL_PAGE_CHARS = 4000;
export type GoalDetailSection = "objective" | "tasks" | "history";
export interface GoalDetailQuery { section: GoalDetailSection; task_id?: string; cursor?: string }
export type GoalDetailPage = {ok: true; text: string; content: string; nextCursor?: string; totalChars: number} | {ok: false; text: string};

/** Stable, lossless detail text. Paging never mutates the authoritative record. */
export function goalDetailPage(goal: GoalRecord, query: GoalDetailQuery, events: readonly GoalLedgerEvent[] = []): GoalDetailPage {
 let source: string;
 if (query.task_id !== undefined && query.section !== "tasks") return {ok: false, text: "task_id requires section=tasks."};
 if (query.section === "objective") source = `${goal.objective}${goal.verificationContract ? `\n\nVerification contract:\n${goal.verificationContract}` : ""}`;
 else if (query.section === "history") source = events.filter(e => "goalId" in e && e.goalId === goal.id).map(e => JSON.stringify(e)).join("\n");
 else {
  const rows: Array<{task: GoalTask; parent_id?: string}> = [];
  const walk = (tasks: GoalTask[], parent_id?: string): void => { for (const task of tasks) { rows.push({task, parent_id}); if (task.subtasks) walk(task.subtasks, task.id); } };
  walk(goal.taskList?.tasks ?? []);
  const selected = query.task_id ? rows.find(r => r.task.id === query.task_id) : undefined;
  if (query.task_id && !selected) return {ok: false, text: `Task "${query.task_id}" not found.`};
  source = (selected ? [selected] : rows).map(({task: {subtasks, ...task}, parent_id}) => JSON.stringify({...task, parent_id, ...(task.id === goal.currentTaskId ? {current: true} : {})})).join("\n");
 }
 const key = createHash("sha256").update(JSON.stringify([goal.id, query.section, query.task_id, source])).digest("hex");
 let offset = 0;
 if (query.cursor) {
  try {
   if (query.cursor.length > 256) throw new Error();
   const parsed = JSON.parse(Buffer.from(query.cursor, "base64url").toString("utf8"));
   if (parsed.v !== 1 || parsed.key !== key || !Number.isSafeInteger(parsed.offset) || parsed.offset < 0 || parsed.offset > source.length) throw new Error();
   offset = parsed.offset;
  } catch { return {ok: false, text: "Invalid or stale cursor: goal details changed or the section/task differs. Restart this section without cursor."}; }
 }
 let end = Math.min(offset + GOAL_DETAIL_PAGE_CHARS, source.length);
 if (end < source.length && /[\uD800-\uDBFF]/.test(source[end - 1]!)) end--;
 const content = source.slice(offset, end);
 const nextCursor = end < source.length ? Buffer.from(JSON.stringify({v: 1, key, offset: end})).toString("base64url") : undefined;
 const text = `${query.section} for ${goal.id} (${offset}–${end}/${source.length} chars)\n${content}${nextCursor ? `\nMore content: repeat this section/task with cursor="${nextCursor}".` : "\nEnd of section."}`;
 return {ok: true, text, content, nextCursor, totalChars: source.length};
}
