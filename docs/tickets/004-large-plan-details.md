# 004: inspect and continue large plans losslessly

**Status:** done — verified by Codex 2026-09-08 at 5046e7b.
**Blocked by:** 003.
**Requirements:** G2, G4; seams S1, S2.
**What to build:** The user and executor can inspect every task and long field while automatic context stays bounded.

## Agent handoff

Read [spec](../../spec.md), [plan](../../plan.md) sections D1, D2, the
[glossary](../../CONTEXT.md), applicable ADRs, and blocker evidence.
Use the plan's navigation/test table; trace the selected public flow before edits.

**Boundary:** Retrieval and existing presentation at scale. Scope/review sections added by 005/011 reuse the same paging contract; no new dashboard features.

## Acceptance criteria

- [x] Retrieve all 200 nodes and complete contracts/evidence using the existing section/task paging API. Concatenate content pages and compare exact strings, including Unicode and one field longer than 4,000 characters.
- [x] Malformed, wrong-goal/section/task, and changed-content cursors fail with restart guidance; unrelated usage updates leave content cursors valid.
- [x] Select task t142 outside the compact preview and repeat the 002 compaction proof with 200 nodes, including long objective/contracts/audit excerpts; aggregate automatic goal text stays at most 10,000 characters.
- [x] Keep the existing dashboard, task overlay, and confirmation UI usable: all nodes and complete relevant requirements are reachable, and truncation is explicitly indicated. A hidden '+N more' is insufficient for full review.
- [x] Preserve bounded defaults and legacy verbose/history reads; long requested detail is paged, not silently omitted or accumulated in background context.

## Proof and completion

Reconstruct all original task details from public pages, navigate the off-preview task in the existing UI, and resume it after compaction.
Run the inherited S1/S2/S3 command applicable above, targeted prior regression
suites, and the plan's required checks. Record baseline/red (or preservation
characterization), green commands/results, artifact locators, review findings,
and limitations. Acceptance checkboxes require evidence.

Evidence: [independent review and repairs](../reviews/2026-09-08-ticket-004.md),
the milestone log, and `~/Data/pi-goal-x/reliability/004/review-checks.json`.
Full suite: 1011/1011 across 76 files; discovery plus 932 unit checks;
check/lint, five ranking harness tests, dry pack and production audit passed.
All 24 context fixtures and six provider payloads passed. Fresh B2/B7's 53
rows pass the existing regression thresholds with successful mutation effects.
Native public details/accounting and all three large compaction modes pass;
host compositor, dashboard, draft proposal and full status views are covered.
Scope/review sections remain owned by 005/011; packaged/live acceptance is later.
