# 014: prepare the verified fork for an intentional live trial

**Status:** ready-for-agent — approved 2026-09-08; execute after listed blockers.
**Blocked by:** 013 (behavioral acceptance PASS required).
**Requirements:** G9; seams S2 evidence plus prepared configuration diff.
**What to build:** The maintainer has an exact package-selection change and rollback plan ready to review without disturbing the live setup.

## Agent handoff

Read [spec](../../spec.md), [plan](../../plan.md) sections D6, the
[glossary](../../CONTEXT.md), applicable ADRs, and blocker evidence.
Use the plan's navigation/test table; trace the selected public flow before edits.

**Boundary:** Adoption preparation only. Its completion does not require or imply live installation approval; live execution can be a subsequent explicitly authorized action.

## Acceptance criteria

- [ ] Prepare the precise pinned fork source/version and intended dotfiles package-reference/check changes using the qualified candidate; preserve unrelated packages, settings, credentials, and user changes.
- [ ] Include a reviewable before/after selection, no-co-load check, backup locations, isolated rollback evidence, and post-install verification commands. Keep implementation details out of normal goal UI.
- [ ] Record accepted limitations and the six-run result reference; label an unpassed matrix as blocked rather than recommending adoption.
- [ ] Finish all preparation without changing live package selection. Record any later explicit live-trial authorization before applying that action; publication/upstream contributions are separate.

## Proof and completion

A concrete, reproducible package-selection diff and rollback sequence refer to the exact already-tested artifact.
Run the inherited S1/S2/S3 command applicable above, targeted prior regression
suites, and the plan's required checks. Record baseline/red (or preservation
characterization), green commands/results, artifact locators, review findings,
and limitations. Acceptance checkboxes require evidence.

Evidence: pending implementation.
