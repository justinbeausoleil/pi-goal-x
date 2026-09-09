# 012: qualify the packed fork and rollback across existing surfaces

**Status:** in-progress — Codex; all blockers verified, 2026-09-08.
**Blocked by:** 004, 005, 006, 008, 009, 010, 011.
**Requirements:** G9, G13; seams S1, S2.
**What to build:** An isolated user can install the exact candidate, use the original goal surfaces, and restore the prior package/data safely.

## Agent handoff

Read [spec](../../spec.md), [plan](../../plan.md) sections D6, the
[glossary](../../CONTEXT.md), applicable ADRs, and blocker evidence.
Use the plan's navigation/test table; trace the selected public flow before edits.

**Boundary:** Installed-artifact compatibility and regression qualification. Reuse existing tests; substantial newly discovered defects get bounded child tickets rather than an unbounded cleanup. No live package selection or npm publication.

## Acceptance criteria

- [ ] Give the packed candidate the D6 fork name/prerelease identity and correct repository/install/notice metadata; preserve MIT attribution, ancestry, and upstream publication guard. Record commit and tarball hashes.
- [ ] Install/load the actual tarball alone through Pi in isolated agent/project directories. Verify Pi 0.85.1 and declared Node 22.15/24 compatibility, or narrow declarations to what passed.
- [ ] Exercise all 16 registered slash commands, five normal tools, three draft tools, lifecycle-dependent visibility and executor validation, both modes, dashboard/overlay/status/list, and documented keybindings against the lifecycle matrix.
- [ ] Run existing layered-settings/UI suites for global/project/env precedence, override removal, refresh/cache invalidation, invalid values, task/contract disabling, auditor/Oracle selection, and finite/unbounded retry settings. No data/requirements disappear when a feature is disabled.
- [ ] Read copied legacy goals/sessions, migrate a synthetic record, make fork changes, then restore pretrial package/settings/data while preserving the fork-written copy separately. Do not claim upstream can rewrite new metadata losslessly.
- [ ] Run D6 build/test/payload/package and applicable CI gates, real-SDK serial tests, existing shell-harness tests, runner discovery checks, and dependency audits; report inherited failures separately. Verify current architecture, agent-flow, experiment support matrix, release notes, and package instructions match the fork without rewriting historical records. Preserve package users' other packages/settings and use no credentials/private data in artifacts.

## Proof and completion

Load one packed fork, complete an isolated guided-to-archive smoke path, exercise recovery/settings, and restore the pretrial environment with byte-preserved source backups.
Run the inherited S1/S2/S3 command applicable above, targeted prior regression
suites, and the plan's required checks. Record baseline/red (or preservation
characterization), green commands/results, artifact locators, review findings,
and limitations. Acceptance checkboxes require evidence.

Evidence: pending implementation.

Planning count correction: both the original runtime baseline fe430b2 and the
current fork register the same16 commands in extensions/goal-commands.ts. The
approved text's17 was a counting error; no command was removed or added. Verify
the actual complete set through the packed loader.
