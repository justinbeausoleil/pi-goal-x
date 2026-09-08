# 010: coordinate provider recovery with Pi and user stops

**Status:** done — verified by Codex and independently reviewed, 2026-09-08.
**Blocked by:** 007.
**Requirements:** G5, G12; seams S1.
**What to build:** A transient outage can recover according to settings without duplicate turns or overruling a user stop.

## Agent handoff

Read [spec](../../spec.md), [plan](../../plan.md) sections D5, the
[glossary](../../CONTEXT.md), applicable ADRs, and blocker evidence.
Use the plan's navigation/test table; trace the selected public flow before edits.

**Boundary:** Provider/compaction failures and retry scheduling. No new retry subsystem or changes to production default policy.

## Acceptance criteria

- [x] Exercise immediate host retry, transport abort without user signal, classified transient network error, nontransient error, successful overflow recovery, and failed/cancelled compaction through actual host lifecycle.
- [x] Schedule extension recovery only after host settlement; successful host retries/overflow do not leave an extra continuation. Failed requests do not advance task completion.
- [x] Test a finite extension retry cap with controlled timing, bounded delay behavior, success reset, exhaustion reporting, and cancellation on pause/unfocus/focus/session change.
- [x] Preserve configured maxAttempts=0 unbounded semantics without an unbounded test; sample its schedule then cancel. Distinguish production defaults from finite test limits.
- [x] Confirm late recovery callbacks and host custom/next-turn messages cannot dispatch stale goal work; record request/effect counts and provider error outcomes.
- [x] Preserve existing empty-turn/nudge limits: inspection-only and text-only automatic responses cannot spin indefinitely. Characterize the baseline policy without introducing new hard question/get_goal gates.

## Proof and completion

Fail then recover once and observe one continued work effect; repeat with a user pause during backoff and observe no recovery work.
Run the inherited S1/S2/S3 command applicable above, targeted prior regression
suites, and the plan's required checks. Record baseline/red (or preservation
characterization), green commands/results, artifact locators, review findings,
and limitations. Acceptance checkboxes require evidence.

Evidence: `~/Data/pi-goal-x/reliability/010/` contains native threshold failure/
cancellation reds with actual forbidden writes and14 passing repaired provider
cases. Native timers assert settlement, cap/delay behavior and cancellation.
The milestone log retains fixture corrections and the ownership review repair.
Final e819b8d passes1315/1315 full tests, type/lint,53 unchanged timing limits
and dry pack. Discovery, CI and unchanged dependency/payload evidence are recorded
in `review-checks.json`. Both independent axes are clear.
[Acceptance mapping](../reviews/2026-09-08-ticket-010.md).
