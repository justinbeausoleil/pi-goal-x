# 011: persist trustworthy completion outcomes and archive safely

**Status:** draft — red-team complete; implementation approval pending.
**Blocked by:** 005, 007, 008, 009.
**Requirements:** G6, G7; seams S1, S2.
**What to build:** The user can distinguish reviewed completion, bypass, rejection, cancellation, and archival failure after compaction or reopen.

## Agent handoff

Read [spec](../../spec.md), [plan](../../plan.md) sections D3, the
[glossary](../../CONTEXT.md), applicable ADRs, and blocker evidence.
Use the plan's navigation/test table; trace the selected public flow before edits.

**Boundary:** Completion transaction and latest review persistence. Existing free-text contracts and reviewer are reused; no generalized proof engine.

## Acceptance criteria

- [ ] Reject completion with configured required-task gates, missing contract evidence, or unresolved retained scope; optional planning semantics stay as defined in D3. A nonempty evidence string alone is not independent proof.
- [ ] Persist latest review outcome/report/work revision/bypass origin in authoritative goal metadata; expose full scope and review through D2 paging and bounded next-response steering. Ledger failure cannot erase rejection.
- [ ] Drive every D3 outcome-table row: approve, reject, malformed/no marker, provider error, user cancel/continue, all three user-owned bypass origins, and stale focus/work revision.
- [ ] Verify the independent auditor uses actual synthetic workspace evidence and retained contracts. Executor claims, audit-skipped completion, and settings toggles never receive an independently-verified label.
- [ ] Expose the result to the executor before deferred archival; complete/archive once. Inject archive move/write failure and crash/reopen before archival. Existing /goal-recovery must discover the complete-but-unarchived record outside the open pool and retry archival after confirmation, without a new executor/completion turn.
- [ ] Confirm completion from active/paused/budget_limited when evidence permits; blocked must be resumed first. Cancelling/rejecting a review respects an intervening pause/unfocus and cannot start stale work.

## Proof and completion

Reject a false completion, compact/reopen and see its findings; fix artifacts and obtain approval, then demonstrate recoverable archival failure and retry.
Run the inherited S1/S2/S3 command applicable above, targeted prior regression
suites, and the plan's required checks. Record baseline/red (or preservation
characterization), green commands/results, artifact locators, review findings,
and limitations. Acceptance checkboxes require evidence.

Evidence: pending implementation.
