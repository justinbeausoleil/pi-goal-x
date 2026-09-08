# 001: reliably start and continue a goal

**Status:** in-progress — Codex; approved 2026-09-08.
**Blocked by:** None (first slice after implementation approval).
**Requirements:** G1; seams S1.
**What to build:** A direct or confirmed regular/ordered goal starts with its objective and can make a second automatic checkpoint.

## Agent handoff

Read [spec](../../spec.md), [plan](../../plan.md) sections D1, the
[glossary](../../CONTEXT.md), applicable ADRs, and blocker evidence.
Use the plan's navigation/test table; trace the selected public flow before edits.

**Boundary:** Initial startup and a second checkpoint, using small objectives. Repeated compaction belongs to 002; full draft workflow belongs to 005.

## Acceptance criteria

- [ ] Port the missing-objective reproduction to a real Pi session/provider boundary; record the failing upstream command and register one reusable deterministic lifecycle command in the existing test setup.
- [ ] Load with aligned Pi 0.85.1 development and peer dependencies. Exercise /goal, /sisyphus, /goal-direct, /sisyphus-direct, and explicit-user create_goal; a subsequent checkpoint also receives identity/objective or lossless retrieval before work.
- [ ] Trace all actual custom/user kickoff callers. Execution identity, reconciliation, and stale checkpoint validation work even when before_agent_start is skipped.
- [ ] Inject stale, malformed, paused, replaced, and unfocused checkpoints through the real message path; none dispatches a goal work tool. Ordinary explicit user work still works.
- [ ] Keep tiny persisted triggers; no manually emitted startup hooks, direct goal-file seeding, or private-core assertions can satisfy the startup proof.

## Proof and completion

The actual outbound request includes the approved objective; the scripted executor creates one expected synthetic file and the later checkpoint observes it.
Run the inherited S1/S2/S3 command applicable above, targeted prior regression
suites, and the plan's required checks. Record baseline/red (or preservation
characterization), green commands/results, artifact locators, review findings,
and limitations. Acceptance checkboxes require evidence.

Evidence: pending implementation.
