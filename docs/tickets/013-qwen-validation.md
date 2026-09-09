# 013: measure Qwen benefit with one bounded comparison

**Status:** in-progress — reopened after maintainer correction: repair offline setup and run the bounded comparison. Model budget unchanged.
**Blocked by:** 012 (done).
**Requirements:** G8 diagnostic stage; seams S1 setup and S3 real executor.
**What to build:** One compact upstream-versus-fork result that shows whether the fork helps Qwen resume correct work after a controlled compaction, within a fixed token budget.

## Agent handoff

Read [spec](../../spec.md), [plan D6](../../plan.md#d6--package-and-live-validation),
and the [glossary](../../CONTEXT.md). Reuse the existing native harness and
qualified artifact. The original broad matrix is deferred, not automatically
restarted. Do not alter runtime code to chase a passing diagnostic.

## Acceptance criteria

- [x] Freeze one small work fixture, a recorded lossy summary, equivalent public goal setup, upstream/candidate identities, settings and independent expected effects before calling Qwen. Exercise native post-compaction continuation without asking the model to build a plan first.
- [ ] Run Qwen3.6 with thinking off: at most two executor responses per version, four requests total, 256 generated tokens per request. Enforce the complete-input limit of 4,096 tokens per request before dispatch; at most 17,408 input plus output tokens for the pair and five minutes total. If enforcement is unavailable, stop without model calls.
- [ ] Disable model-based setup/summaries/audit/Oracle and all retries/recovery. Score actual next-task work, the pending requirement and absence of repeated completed-work writes. No model judge or new benchmark framework.
- [x] Report both outcomes, actual usage, elapsed time, errors, artifact checks and limitations once. Truncation or setup/budget failure is inconclusive. A positive diagnostic requires every fork check to pass and at least one upstream check to fail; a tie does not demonstrate benefit.
- [x] Stop after this pair or invalid preflight. Retain all earlier failures and the interruption record. No automatic repeats, second model or broader matrix, including after a positive result. Hand the report to 014 for a decision.

Execution/scoring criteria above remain unevaluated: the offline complete-input
counter failed before dispatch because the installed full MLX processor requires
missing PyTorch/Torchvision dependencies. No approximate count, dependency
installation or Qwen call followed. An inconclusive preflight is the permitted
terminal outcome, not a passing behavioral test. Both versions reached equivalent
public setup and native compaction. See the
[diagnostic and adoption decision](../reviews/2026-09-08-qwen-benefit-decision.md)
for all four offline preparation attempts, zero usage and evidence locators.

## Proof and completion

An honest negative or inconclusive result can complete this diagnostic ticket.
It does **not** satisfy G8's broader six-of-six acceptance gate. A recorded
summary tests continuation under controlled information loss; it does not test
Qwen summary quality or establish general reliability. Validate new probe
plumbing with a focused offline check; reuse 012's completed qualification.
Inspect one compact final result without repeated Codex polling or extra agents.
No real model calls were made during replanning or diagnostic preparation.

## Retained evidence

- Matrix01 was superseded before execution, with zero model attempts.
- Matrix02 completed **FAIL, 0/6**, using reliability.1. Its frozen configuration,
  all outcomes and usage remain in `~/Data/pi-goal-x/reliability/013/matrix-02/`;
  see the [complete report](../reviews/2026-09-08-qwen-matrix-02.md).
- Reviewed native-prompt and bounded-pressure harness repairs are retained.
  The replacement reliability.2 package at source
  `e47f475a37ddc04db1e68199c33041888a3d32c1` is qualified;
  SHA256 `1f32b6757aad3889933c543a3eead173747faf9c7f27860cbede98fdf5be3e64`.
  Qualification: `~/Data/pi-goal-x/reliability/012/reliability-02/qualification.json`.
- Matrix03 froze that artifact at integrated source
  `5af1169ee02401d61e16df4c2bee6226b7980f3e`. The maintainer's replan stopped it:
  runs 01–02 failed `incomplete milestone: parse`; run 03 was interrupted;
  runs 04–06 were cancelled before starting. It did not pass acceptance.
  Frozen files and partial logs remain unchanged. The separate record is
  `~/Data/pi-goal-x/reliability/013/matrix-03/interruption.json`.

The former six-run protocol remains in D6 and the
[experiment guide](../../experiments/reliability/README.md) for a separately
chosen future evaluation. Completed attempts are not relabelled as diagnostic
results, and cancellation is not a completed benchmark failure.
