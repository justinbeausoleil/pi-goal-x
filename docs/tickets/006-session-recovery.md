# 006: recover sessions without inherited autonomous authority

**Status:** done — Codex; verified at `d5ad5cb` on 2026-09-08, both independent review axes clear.
**Blocked by:** 002.
**Requirements:** G6, G13; seams S1, S2.
**What to build:** Reopening, forking, navigating, refreshing, or repairing a session preserves project work and obeys explicit focus rules.

## Agent handoff

Read [spec](../../spec.md), [plan](../../plan.md) sections D4, the
[glossary](../../CONTEXT.md), applicable ADRs, and blocker evidence.
Use the plan's navigation/test table; trace the selected public flow before edits.

**Boundary:** Session/persistence ownership and existing recovery. In-run stop races belong to 007; distributed execution leases and cross-session exactly-once workspace effects are excluded.

## Acceptance criteria

- [x] Exercise every D4 ownership-table row through real session operations: active/paused/blocked/limited reopen, reload, new session, explicit-null/missing focus, autoSelectSingleGoal, fork, and backward navigation.
- [x] Confirm disk wins over historical chat. A fork appends null focus before scheduling; tree navigation requires explicit focus/resume before automatic work. Disposed-session callbacks cannot act in a replacement session.
- [x] Retain legacy goal/focus/draft reads, legacy user-edited prompt reconciliation, and public /goal-refresh results. 005 owns the later retained-scope discrepancy check; 012 reruns reconciliation against both legacy and migrated records. Corrupt/symlink/unsafe records cannot overwrite valid progress; report diagnostics.
- [x] Race stale storage revisions and inject write/ledger/lock failures at S2. Writes remain atomic, failed authoritative writes do not commit, ledger-only failures warn, and conflicts return actionable current-state guidance.
- [x] Exercise /goal-status health and /goal-recovery read-only diagnosis, repair confirmation/cancel, backup, and repair failure; never silently repair during a read.
- [x] Load delegated children, auditor, and Oracle sessions and verify no parent goal controls or autonomous projection/continuation; preserve their dedicated contexts.

## Proof and completion

Complete work, navigate to earlier chat and fork it, then inspect latest project progress while recording zero unsolicited fork/tree work-tool effects.
Run the inherited S1/S2/S3 command applicable above, targeted prior regression
suites, and the plan's required checks. Record baseline/red (or preservation
characterization), green commands/results, artifact locators, review findings,
and limitations. Acceptance checkboxes require evidence.

Evidence: [independent review and criterion mapping](../reviews/2026-09-08-ticket-006.md),
`~/Data/pi-goal-x/reliability/006/review-checks.json` and retained red/green logs.
Frozen `d5ad5cb` passes1141 full tests; Spec independently passes all58 native
ownership/storage/recovery cases and Standards six final failure compositions.
Type/lint, discovery, context/provider, benchmark/CI, ranking and dry-pack checks
pass. A partial archive copy is retained and diagnosed if active-file removal
fails; the active record remains authoritative and explicit retry is supported.
In-run stops, completed-goal restart recovery and package/model acceptance remain
with their named later tickets. Next frontier:007.
