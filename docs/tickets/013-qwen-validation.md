# 013: execute the fixed real-Qwen acceptance matrix

**Status:** in-progress — Codex; matrix03 frozen and running on qualified reliability.2; matrix02 retained0/6.
**Blocked by:** 012.
**Requirements:** G8; seams S3.
**What to build:** The maintainer sees all outcomes from a frozen six-run artifact-producing experiment on the installable candidate.

## Agent handoff

Read [spec](../../spec.md), [plan](../../plan.md) sections D6, the
[glossary](../../CONTEXT.md), applicable ADRs, and blocker evidence.
Use the plan's navigation/test table; trace the selected public flow before edits.

**Boundary:** Real model use of the proven mechanism. Deterministic lifecycle tests own overflow and 200-node capacity; the live fixture must do meaningful work rather than task recall.

## Acceptance criteria

- [x] Freeze the D6 fixture, independent expected outputs, candidate/tarball hash, input seeds, tool configuration, context/output limits, and off/low/low allocation for each model before running.
- [ ] Run all six scheduled cases through Pi using public goal operations, real tools, and native model-generated summaries. Each must reach manual/threshold/manual compactions; record evidence of the host threshold trigger.
- [x] Enforce 60 executor responses, 30 minutes, and two extension recovery attempts per run. Model unavailability, timeouts, missing compactions, or failed artifacts count as failed scheduled cases; no retry-until-pass.
- [ ] Independently verify normalizer, normalized JSON, aggregates, rejection report, checks, and documentation against frozen expected results; verify task/requirement transitions and audited completion.
- [x] Record every attempt's environment/model/settings, all exposed token categories, elapsed time, summaries/compaction counts, retries/errors, artifact checks, final state, and limitations; keep secrets/private data out.
- [x] Report acceptance PASS only for six of six passing cases. Publish a failed matrix honestly and block adoption; any changed candidate starts a new numbered matrix without deleting earlier attempts.

## Proof and completion

Deliver a reproducible results table and artifact locators for every scheduled case, with an unambiguous six-of-six adoption gate.
Run the inherited S1/S2/S3 command applicable above, targeted prior regression
suites, and the plan's required checks. Record baseline/red (or preservation
characterization), green commands/results, artifact locators, review findings,
and limitations. Acceptance checkboxes require evidence.

Fixture and driver: [experiment guide](../../experiments/reliability/README.md).
Preparation source: `e6302fce600c1016acf83210b44124699a895f65`.
Both independent review axes clear the pre-S3 implementation. The three native
rehearsals prove incomplete rejection, actual execution of nested checks, audited
completion/archive and rejection of final artifacts corrupted by a passing test.
Type/lint and discovery/selfcheck958 pass; Data013/preparation-e6302fc.json has
evidence locators. These checks do not constitute real-model acceptance.

Frozen run configuration and independent answers:
`~/Data/pi-goal-x/reliability/013/matrix-02/matrix.json`.
The same directory contains the six fixed commands and per-run evidence.
Matrix01 remains unchanged and explicitly superseded before execution (zero
model attempts), following two repaired independent-review findings.

Qualified artifact source: `8e012c7323b8cb21c223432fab0a53b83683fe5e`;
`@justinbeausoleil/pi-goal-x@0.31.2-reliability.1`, SHA256
`e2f0f850bf2d66cc5c042e29c429168a40ad7bb9f6200014138e56e8f94e7aa6`.
Location: Data012/attempt-04. Matrix02 uses that exact installed artifact.
All six scheduled outcomes are recorded: **matrix02 FAIL,0/6**.
See [the complete results report](../reviews/2026-09-08-qwen-matrix-02.md).
G8 remains unmet;014 requires6/6. Reviewed harness repairs and cumulative runtime
repairs require a newly qualified artifact and a new full matrix afterward.

Replacement qualification is complete at source
`e47f475a37ddc04db1e68199c33041888a3d32c1`, reliability.2, SHA256
`1f32b6757aad3889933c543a3eead173747faf9c7f27860cbede98fdf5be3e64`.
Data012/reliability-02/qualification.json and both review axes verify it.
Matrix03 freezes this artifact at integrated source
`5af1169ee02401d61e16df4c2bee6226b7980f3e`:
`~/Data/pi-goal-x/reliability/013/matrix-03/matrix.json`.
All six commands are recorded before execution; each runs once through its
original watchdog. Native prompt and bounded-pressure repairs are included.
Reporting checkboxes above retain the completed matrix02 evidence; matrix03
must independently reach6/6 before this ticket can be done.
