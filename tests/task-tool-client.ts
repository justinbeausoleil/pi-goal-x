import type { ExtensionContext, ToolDefinition } from "@earendil-works/pi-coding-agent";
import type { GoalStateEntry } from "../extensions/goal-record.ts";

/** Existing task clients now read the public work revision before proposing a mutation. */
export async function readWorkRevision(h: { tools: { get(name: string): ToolDefinition | undefined }; ctx: unknown }): Promise<string | undefined> {
	const result = await h.tools.get("get_goal")!.execute("work-revision", {}, undefined, undefined, h.ctx as ExtensionContext);
	return (result.details as GoalStateEntry).work_revision;
}
