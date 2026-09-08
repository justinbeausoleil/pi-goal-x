# 002: preserve every lifecycle state through compaction

**Status:** ready-for-agent — approved 2026-09-08; execute after listed blockers.
**Blocked by:** 001.
**Requirements:** G2, G4; seams S1.
**What to build:** The next response sees current durable work and the correct allowed action after compaction or an in-run mutation.

## Agent handoff

Read [spec](../../spec.md), [plan](../../plan.md) sections D1, the
[glossary](../../CONTEXT.md), applicable ADRs, and blocker evidence.
Use the plan's navigation/test table; trace the selected public flow before edits.

**Boundary:** Context delivery and lifecycle projection. Use existing small-plan public tools; 004 repeats the proof at 200 nodes and exercises long-field retrieval.

## Acceptance criteria

- [ ] Demonstrate an off-preview current task lost by the baseline despite durable state. Through real public task tools, complete an earlier task, select a later one, and mutate it between model responses.
- [ ] Run three successive compactions in each manual, threshold, and overflow scenario, including threshold between tools/responses inside one run. Observe task identity, statuses, scope/contract locators, and preserved completed transitions.
- [ ] Replace stale dynamic system goal state with one bounded ephemeral projection; count all injected goal text against the 10,000-character cap, including long objective/contract/rejection/pause/Oracle fields and warnings.
- [ ] Exercise active, paused, blocked, budget_limited, unfocused, and completed states. Preserve applicable reasons, wrap-up, audit, Oracle, and stall steering without making a stopped goal active.
- [ ] Inspect persisted session messages: no accumulated projection; compact checkpoint history; preserve normal messages, assistant/tool-result pairing, other extension context, and the separate summarizer request.
- [ ] Observe one host overflow continuation, with no second extension continuation; 010 owns failure/backoff policy.

## Proof and completion

Outbound requests after each compaction retain the off-preview current task; durable state and effect counts show no omitted or repeated completion.
Run the inherited S1/S2/S3 command applicable above, targeted prior regression
suites, and the plan's required checks. Record baseline/red (or preservation
characterization), green commands/results, artifact locators, review findings,
and limitations. Acceptance checkboxes require evidence.

Evidence: pending implementation.
