# 008: exhaust a budget once and preserve accurate usage

**Status:** in-progress — Codex; 007 verified at `55188db` on 2026-09-08.
**Blocked by:** 007.
**Requirements:** G2, G11; seams S1, S2.
**What to build:** A budget-limited goal stops with an honest wrap-up and resumes only after the user makes budget available.

## Agent handoff

Read [spec](../../spec.md), [plan](../../plan.md) sections D5, the
[glossary](../../CONTEXT.md), applicable ADRs, and blocker evidence.
Use the plan's navigation/test table; trace the selected public flow before edits.

**Boundary:** Existing budget/accounting behavior through the repaired lifecycle, plus exhausted-resume guard. No new budget UI or token estimator.

## Acceptance criteria

- [ ] Trace executor token/time accounting through custom kickoff, normal turns, repeated events, user abort, provider retry, compaction, focus changes, and reopen; charge once to the originating goal.
- [ ] Exercise exactly-at and overshoot budgets. Persist one budget_limited transition, cancel queued work, and show at most one wrap-up with current task/remaining work and no false completion.
- [ ] Compaction/reopen preserves limited status and visible usage; a still-exhausted /goal-resume cannot dispatch new substantive work.
- [ ] Raise/remove the budget using the supported user-owned metadata/refresh path, then resume explicitly without losing prior usage or requirements.
- [ ] Keep positive-integer budget validation and existing accounting meaning; auxiliary summarizer/auditor/Oracle usage is not silently rebilled as executor usage. Use controlled time and usage fixtures rather than wall-clock sleeps.

## Proof and completion

A deterministic provider reaches a small budget during continuation, emits one wrap-up, remains stopped after compaction/reopen, then resumes after an explicit budget change.
Run the inherited S1/S2/S3 command applicable above, targeted prior regression
suites, and the plan's required checks. Record baseline/red (or preservation
characterization), green commands/results, artifact locators, review findings,
and limitations. Acceptance checkboxes require evidence.

Baseline: native agent pause at55188db loses220 reported executor tokens from
the pause and its final follow-up. Public storage remains at220 tokens instead
of charging either response. Reproduction and log:
`~/Data/pi-goal-x/reliability/008/accounting-baseline.mjs` and
`terminal-pause-red-55188db.log`. Implementation and remaining criteria pending.
