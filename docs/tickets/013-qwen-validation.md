# 013: execute the fixed real-Qwen acceptance matrix

**Status:** ready-for-agent — approved 2026-09-08; execute after listed blockers.
**Blocked by:** 012.
**Requirements:** G8; seams S3.
**What to build:** The maintainer sees all outcomes from a frozen six-run artifact-producing experiment on the installable candidate.

## Agent handoff

Read [spec](../../spec.md), [plan](../../plan.md) sections D6, the
[glossary](../../CONTEXT.md), applicable ADRs, and blocker evidence.
Use the plan's navigation/test table; trace the selected public flow before edits.

**Boundary:** Real model use of the proven mechanism. Deterministic lifecycle tests own overflow and 200-node capacity; the live fixture must do meaningful work rather than task recall.

## Acceptance criteria

- [ ] Freeze the D6 fixture, independent expected outputs, candidate/tarball hash, input seeds, tool configuration, context/output limits, and off/low/low allocation for each model before running.
- [ ] Run all six scheduled cases through Pi using public goal operations, real tools, and native model-generated summaries. Each must reach manual/threshold/manual compactions; record evidence of the host threshold trigger.
- [ ] Enforce 60 executor responses, 30 minutes, and two extension recovery attempts per run. Model unavailability, timeouts, missing compactions, or failed artifacts count as failed scheduled cases; no retry-until-pass.
- [ ] Independently verify normalizer, normalized JSON, aggregates, rejection report, checks, and documentation against frozen expected results; verify task/requirement transitions and audited completion.
- [ ] Record every attempt's environment/model/settings, all exposed token categories, elapsed time, summaries/compaction counts, retries/errors, artifact checks, final state, and limitations; keep secrets/private data out.
- [ ] Report acceptance PASS only for six of six passing cases. Publish a failed matrix honestly and block adoption; any changed candidate starts a new numbered matrix without deleting earlier attempts.

## Proof and completion

Deliver a reproducible results table and artifact locators for every scheduled case, with an unambiguous six-of-six adoption gate.
Run the inherited S1/S2/S3 command applicable above, targeted prior regression
suites, and the plan's required checks. Record baseline/red (or preservation
characterization), green commands/results, artifact locators, review findings,
and limitations. Acceptance checkboxes require evidence.

Evidence: pending implementation.
