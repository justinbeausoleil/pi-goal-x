# 007: stop queued goal work and prioritize user steering

**Status:** ready-for-agent — approved 2026-09-08; execute after listed blockers.
**Blocked by:** 006.
**Requirements:** G5; seams S1, S2.
**What to build:** User or agent control changes stop future goal work while preserving unrelated explicit user requests.

## Agent handoff

Read [spec](../../spec.md), [plan](../../plan.md) sections D4, the
[glossary](../../CONTEXT.md), applicable ADRs, and blocker evidence.
Use the plan's navigation/test table; trace the selected public flow before edits.

**Boundary:** In-session stop/supersession boundary. Budget and provider-specific cancellation proofs belong to 008/010.

## Acceptance criteria

- [ ] Race user pause, Esc/abort, agent pause with reason/suggestion, unfocus, focus switch, and confirmed clear against a queued checkpoint, an active response, a task dialog, and an async audit/Oracle result.
- [ ] Invalidate the old goal/session generation; block each new goal work-tool dispatch after stop. Abort already-running work where supported and report effects already dispatched without claiming rollback.
- [ ] Pending user steering takes precedence over automatic work. Cover host custom/next-turn queues as well as ordinary messages; do not treat hasPendingMessages as an exhaustive queue acknowledgement.
- [ ] Cancellation of clear/dialog is a durable no-op. Resume restores only an eligible explicitly selected goal; failed/stale completion or confirmation cannot modify the newly focused goal.
- [ ] An ordinary explicit user request can still run normal Pi tools while the goal is paused/unfocused. Preserve the existing read-only post-stop allowlist and Esc collapse versus pause behavior.

## Proof and completion

Queue goal A, pause or switch to B before dispatch, and observe zero new A work effects while the user's intended next request runs.
Run the inherited S1/S2/S3 command applicable above, targeted prior regression
suites, and the plan's required checks. Record baseline/red (or preservation
characterization), green commands/results, artifact locators, review findings,
and limitations. Acceptance checkboxes require evidence.

Evidence: pending implementation.
