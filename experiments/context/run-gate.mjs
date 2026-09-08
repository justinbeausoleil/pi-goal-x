/**
 * context:gate — CI-safe invariants over the composed-request baseline (PR D).
 *
 * Re-measures every fixture IN PROCESS and requires:
 *   1. deterministic equality with experiments/context/baseline-main.json;
 *   2. tool schemas present in every breakdown;
 *   3. every semantic field classified (counts object complete);
 *   4. provider-visible checkpoint history <= 1 on active-goal fixtures;
 *   5. every registered fixture ID covered by the baseline.
 * No network, no child agents, no live model.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as path from "node:path";

import { captureOne } from "./capture-context.mjs";
import { FIXTURES } from "./fixtures.mjs";
import { automaticGoalText, measureContext, semanticCounts, serializeRequest } from "./measure-context.mjs";

function serializedRequestText(captured) {
	return serializeRequest(captured).total;
}

function escapeRegExp(text) {
	return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const here = path.dirname(fileURLToPath(import.meta.url));
const failures = [];

// Native summaries are provider-visible too; a duplicate must never evade the gate.
for (const role of ["compactionSummary", "branchSummary"]) {
	const marker = "[PI GOAL ACTIVE goalId=summary-probe]";
	const probe = semanticCounts({ baseSystem: "", messages: [
		{ role, summary: marker, timestamp: 0 },
		{ role: "custom", customType: "pi-goal-context", content: marker, timestamp: 0 },
	] });
	if (probe.goalActiveMarker !== 2) failures.push(`${role}: provider-visible summary text was not counted`);
}

const baseline = JSON.parse(readFileSync(path.join(here, "baseline-main.json"), "utf8"));
const baselineById = new Map(baseline.fixtures.map((r) => [r.fixture, r]));

const expectedFixtureIds = Object.keys(FIXTURES).sort();
for (const id of expectedFixtureIds) {
	if (!baselineById.has(id)) failures.push(`fixture missing from baseline: ${id}`);
}
for (const id of baselineById.keys()) {
	if (!FIXTURES[id]) failures.push(`baseline contains unknown fixture: ${id}`);
}

let checked = 0;
for (const fixtureId of expectedFixtureIds) {
	const scenario = FIXTURES[fixtureId]();
	const captured = await captureOne(fixtureId);
	const breakdown = measureContext(captured);
	const semantic = semanticCounts({ ...captured, goal: scenario.goal });
	const goalText = automaticGoalText(captured);
	if (goalText.length > 10000) failures.push(`${fixtureId}: aggregate automatic goal text exceeds 10000 characters (${goalText.length})`);
	checked += 1;

	// 1. deterministic equality
	const baseRow = baselineById.get(fixtureId);
	if (baseRow && JSON.stringify(baseRow.breakdown) !== JSON.stringify(breakdown)) {
		failures.push(`${fixtureId}: breakdown drifted from committed baseline — update baseline-main.json WITH a spec rationale if intentional`);
	}
	if (baseRow && JSON.stringify(baseRow.semantic) !== JSON.stringify(semantic)) {
		failures.push(`${fixtureId}: semantic counts drifted from committed baseline`);
	}

	// 2. tool schemas included
	if (!(breakdown.toolSchemaChars > 0)) failures.push(`${fixtureId}: no tool schema bytes measured`);

	// 3. semantic fields classified
	for (const key of ["objective", "verificationContract", "currentTask", "lifecyclePolicyThirdBlocker", "independentAuditor", "neverEditObjective"]) {
		if (!(key in semantic)) failures.push(`${fixtureId}: semantic field ${key} not classified`);
	}

 const names = captured.tools.map(t => t.name);
 if (scenario.draftPrompt && JSON.stringify([...names].sort()) !== JSON.stringify(["goal_question", "goal_questionnaire", "propose_goal_draft"].sort())) failures.push(`${fixtureId}: incorrect drafting profile`);
 if (scenario.draftPrompt && (!goalText.includes("[PI GOAL DISCUSSION]") || goalText.includes("Use work tools directly"))) failures.push(`${fixtureId}: drafting lacks discussion-only context`);
 if (fixtureId === "tasks-disabled" && names.some(n => n === "set_goal_tasks" || n === "update_goal_task")) failures.push(`${fixtureId}: disabled tools advertised`);
 if (["completion-audit", "completion-audit-retained", "audit-rejection-and-rework", "oracle-consultation"].includes(fixtureId) && !(breakdown.childRequestChars > 0)) failures.push(`${fixtureId}: child request not captured`);
 if (fixtureId === "completion-audit-retained") for (const needle of ["Approved retained goal contract", "Approved retained requirement t0", "Artifact proof for t1", "retained_tasks"])
  if (!JSON.stringify(captured.childRequests).includes(needle)) failures.push(`${fixtureId}: missing retained audit input ${needle}`);
 if (fixtureId === "post-compaction-turn" && !goalText.includes("POST-COMPACTION RESYNC")) failures.push(`${fixtureId}: compaction hook was not exercised`);
	if (captured.extensionSystem.includes("[PI GOAL")) failures.push(`${fixtureId}: dynamic goal state remains in system prompt`);

	// 4. checkpoint history bounded (post-#30 invariant)
	if (breakdown.historicalCheckpointChars > 0) {
		failures.push(`${fixtureId}: historical checkpoint payload visible to the provider (${breakdown.historicalCheckpointChars} chars) — must stay filtered`);
	}

	// Required single-source markers on active-goal fixtures whose turn was
	// actually dispatched with an active block (a stale-checkpoint trigger
	// correctly aborts and injects GOAL STALE instead).
	const hasActiveBlock = /\[PI GOAL ACTIVE goalId=/.test(goalText);
	if (scenario.pendingScope) {
		for (const needle of ["PI GOAL SCOPE REVIEW", "Approved objective sentinel", "Approved contract sentinel", "Proposed objective sentinel", 'get_goal(section="scope")', "required-142", "Pending audit objection sentinel", "Pending Oracle step sentinel"])
			if (!goalText.includes(needle)) failures.push(`${fixtureId}: pending review lost ${needle}`);
		if (hasActiveBlock || goalText.includes("Use work tools directly")) failures.push(`${fixtureId}: pending review grants implementation authority`);
		if (scenario.goal.status === "blocked") for (const needle of ["Pending stop reason sentinel", "Pending action sentinel"])
			if (!goalText.includes(needle)) failures.push(`${fixtureId}: pending review lost ${needle}`);
		if (scenario.goal.status === "budget_limited" && !goalText.includes("Budget exhausted: summarize what was accomplished and what remains")) failures.push(`${fixtureId}: pending review lost budget wrap-up`);
	}
	if (hasActiveBlock && !goalText.includes('get_goal(section="scope")')) failures.push(`${fixtureId}: retained scope retrieval missing`);
	if (scenario.goal?.status === "active" && !scenario.pendingScope && fixtureId !== "stale-checkpoint" && !hasActiveBlock) failures.push(`${fixtureId}: active goal projection missing`);
	if (scenario.goal?.status === "active" && hasActiveBlock) {
		if (semantic.goalActiveMarker !== 1) failures.push(`${fixtureId}: [PI GOAL ACTIVE] block count ${semantic.goalActiveMarker} != 1`);
		// Long objectives are truncated to MAX_OBJECTIVE_BLOCK_CHARS — only the
		// head can appear. Fixtures use unique (non-periodic) text so a 300-char
		// head is an unambiguous needle.
		const fullObjective = scenario.goal.objective ?? "";
		const objectiveNeedle = fullObjective.slice(0, 300);
		const objectiveOccurrences = objectiveNeedle
			? (goalText.match(new RegExp(escapeRegExp(objectiveNeedle), "g")) ?? []).length
			: 0;
		if (objectiveOccurrences !== 1) failures.push(`${fixtureId}: objective appears ${objectiveOccurrences}x in composed request (must be exactly 1)`);
		if (scenario.goal?.verificationContract && fixtureId !== "get-goal-default-and-verbose" && semantic.verificationContract !== 1) {
			failures.push(`${fixtureId}: verification contract appears ${semantic.verificationContract}x (must be exactly 1)`);
		}
	}
}

console.log(`[context:gate] re-measured ${checked} fixtures against baseline-main.json (${baseline.fixtures.length} rows)`);
if (failures.length > 0) {
	console.error("[context:gate] FAIL:");
	for (const failure of failures) console.error(`  - ${failure}`);
	process.exit(1);
}
console.log("[context:gate] PASS");
