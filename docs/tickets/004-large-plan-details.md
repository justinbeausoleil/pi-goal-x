# 004: inspect and continue large plans losslessly

**Status:** ready-for-agent — approved 2026-09-08; execute after listed blockers.
**Blocked by:** 003.
**Requirements:** G2, G4; seams S1, S2.
**What to build:** The user and executor can inspect every task and long field while automatic context stays bounded.

## Agent handoff

Read [spec](../../spec.md), [plan](../../plan.md) sections D1, D2, the
[glossary](../../CONTEXT.md), applicable ADRs, and blocker evidence.
Use the plan's navigation/test table; trace the selected public flow before edits.

**Boundary:** Retrieval and existing presentation at scale. Scope/review sections added by 005/011 reuse the same paging contract; no new dashboard features.

## Acceptance criteria

- [ ] Retrieve all 200 nodes and complete contracts/evidence using the existing section/task paging API. Concatenate content pages and compare exact strings, including Unicode and one field longer than 4,000 characters.
- [ ] Malformed, wrong-goal/section/task, and changed-content cursors fail with restart guidance; unrelated usage updates leave content cursors valid.
- [ ] Select task t142 outside the compact preview and repeat the 002 compaction proof with 200 nodes, including long objective/contracts/audit excerpts; aggregate automatic goal text stays at most 10,000 characters.
- [ ] Keep the existing dashboard, task overlay, and confirmation UI usable: all nodes and complete relevant requirements are reachable, and truncation is explicitly indicated. A hidden '+N more' is insufficient for full review.
- [ ] Preserve bounded defaults and legacy verbose/history reads; long requested detail is paged, not silently omitted or accumulated in background context.

## Proof and completion

Reconstruct all original task details from public pages, navigate the off-preview task in the existing UI, and resume it after compaction.
Run the inherited S1/S2/S3 command applicable above, targeted prior regression
suites, and the plan's required checks. Record baseline/red (or preservation
characterization), green commands/results, artifact locators, review findings,
and limitations. Acceptance checkboxes require evidence.

Evidence: pending implementation.
