# 009: retain blocker and Oracle recovery through compaction

**Status:** done — verified by Codex and independently reviewed, 2026-09-08.
**Blocked by:** 007.
**Requirements:** G2, G12; seams S1, S2.
**What to build:** The executor retains blocker guidance and durable Oracle advice without confusing consultation with progress.

## Agent handoff

Read [spec](../../spec.md), [plan](../../plan.md) sections D5, the
[glossary](../../CONTEXT.md), applicable ADRs, and blocker evidence.
Use the plan's navigation/test table; trace the selected public flow before edits.

**Boundary:** Preserve current blocker/Oracle behavior. No new recurrence engine, model router, or mandatory Oracle.

## Acceptance criteria

- [x] Keep immediate agent pause distinct from blocked; require concrete reasons and preserve suggested action, current task, and three-consecutive-identical-blocker guidance across compaction and explicit resume.
- [x] Characterize the upstream recurrence rule as model policy, not an enforced runtime counter. A deterministic test proves delivery/state transitions, not semantic blocker detection.
- [x] With Oracle disabled, blocked stops work pending user action. With Oracle enabled, test actionable, needs_human, insufficient_context, malformed/provider failure, abort, and configured failure-limit outcomes.
- [x] Reuse advice by blocker fingerprint across compaction/reopen. Require a meaningful follow-up work attempt before re-blocking on actionable advice; inspection/echo-only reads do not discharge it.
- [x] Preserve configured read-only Oracle tools and project-resource policy, stale-focus cancellation, and durable result/failure reporting. Verify no parent goal tools load into consultation.
- [x] Retain stall notices and real active-goal clarification. Repeated get_goal receives soft guidance, not a new hard stop; notices/inspection do not count as progress, completion, or authority to bypass a stop.

## Proof and completion

Receive actionable advice, compact away its chat result, retrieve/reinject it from durable state, then record a real follow-up attempt before a permitted block.
Run the inherited S1/S2/S3 command applicable above, targeted prior regression
suites, and the plan's required checks. Record baseline/red (or preservation
characterization), green commands/results, artifact locators, review findings,
and limitations. Acceptance checkboxes require evidence.

Investigation input: Data007/replacement-ordered-trace.log shows the original
active goal repeatedly continuing text-only responses after an invalid ordered
replacement command was rejected. Preserve the failed attempt; diagnose the
D5 no-progress/nudge boundary here. Other implementation evidence pending.

Candidate evidence in `~/Data/pi-goal-x/reliability/009/`: `native-combined.log`
passes27 native checks; `oracle-abort-green.log` passes11 outcome/cancellation
checks. Public fixtures prove actual work, isolated Oracle tools/resources,
three actual summaries and host reopen, fingerprint reuse, soft inspection
guidance, active clarification and explicit resume. `targeted-first.log`
passes53 helper regressions. Final c9b44ee passes1298/1298 full tests, type/lint,
53 unchanged timing limits and dry pack; discovery, payload/CI/audit checks also
pass as recorded in `review-checks.json`. Both independent axes are clear.
[Acceptance mapping and limitations](../reviews/2026-09-08-ticket-009.md).
Milestones retain all reds and fixture corrections, including prior logs whose
names contain "green" but failed. Package/model/adoption gates remain012–014.
