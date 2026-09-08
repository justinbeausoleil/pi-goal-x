# 003: incrementally build a 200-node task plan

**Status:** draft — red-team complete; implementation approval pending.
**Blocked by:** 002.
**Requirements:** G3; seams S1, S2.
**What to build:** The executor builds 180 tasks, appends 20, and edits a small group without replacing unrelated progress.

## Agent handoff

Read [spec](../../spec.md), [plan](../../plan.md) sections D2, the
[glossary](../../CONTEXT.md), applicable ADRs, and blocker evidence.
Use the plan's navigation/test table; trace the selected public flow before edits.

**Boundary:** Task mutation contract and capacity. Lossless detail/UI at scale belongs to 004; scope waiver and draft editing belong to 005.

## Acceptance criteria

- [ ] Implement D2 upsert/replace and expected_work_revision semantics through existing tools/mutation service; expose revisions in inspection, projection, tool results, schemas, and prompts.
- [ ] Build 180 nodes in calls of at most 50, complete selected tasks with evidence, then append 20 publicly. Update selected titles/parents while preserving unrelated IDs, ordering, status/evidence/timestamps and valid currentTaskId.
- [ ] Atomically reject 201 total nodes, 51-entry upsert, duplicate/blank IDs, missing parents, cycles, excessive configured depth, invalid lightweight flags, stale/missing expected revisions, and a batch with one invalid member.
- [ ] Verify omitted fields preserve existing values and parent_id=null moves to a root. Accounting-only writes do not cause false work-revision conflicts; genuine concurrent work changes do.
- [ ] Keep ordered progress batches, normal parent gates, lightweight semantics, and completion/current-task transitions. The full replacement path preserves legacy meaning and explicit structural confirmation.
- [ ] Until 005 supplies human scope revision, reject removal/weakening of existing contracts and title/contract edits to completed tasks. Every structural path must apply D2's reopening rule when those edits become available; task skipping/deletion never implicitly waives scope. A replacement cancelled by the user changes no durable record.

## Proof and completion

Create 180+20 through registered tools, reopen, and retrieve the same 200 IDs and retained evidence. No storage seeding.
Run the inherited S1/S2/S3 command applicable above, targeted prior regression
suites, and the plan's required checks. Record baseline/red (or preservation
characterization), green commands/results, artifact locators, review findings,
and limitations. Acceptance checkboxes require evidence.

Evidence: pending implementation.
