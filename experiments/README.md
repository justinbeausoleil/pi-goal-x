# pi-goal Experiments

This directory contains optional real-model experiment material for
`pi-goal-x`. Runs incur model usage and are not part of `npm test`.

The supported five-tool release cases are C20-C26:

- core five-tool selection and direct explicit goal creation;
- user ownership of lifecycle commands;
- the three-consecutive-turn blocked policy;
- completion audit from actual evidence without model paperwork;
- multiple open goals with session-local focus;
- consolidated task tools;
- token-budget wrap-up behavior.

B1-B2 and C1-C19 have been MIGRATED to the current interface: every case now
targets the five tools (create_goal, get_goal, update_goal, set_goal_tasks,
update_goal_task), the 16-command palette, and user-owned lifecycle commands,
with removed tool names appearing only in negative rubric assertions. The full
supported matrix is machine-readable in `SUPPORTED_CASES.json`; `BASELINE.md`
remains a historical Stage 0 snapshot.

## Running

`SUPPORTED_CASES.json` lists the cases accepted by the launcher:

```bash
cd experiments
bash harness/run.sh C20-core-tool-selection --count 3 --grade --no-smoke
bash harness/run.sh B2-task-completion --count 3 --grade --no-smoke
```

The driver uses Pi 0.85.1's ModelRuntime, resource loader, extension binding and
session shutdown. Agent settings, credentials files, sessions and project state
are isolated under the run directory. Provider environment credentials remain
available; custom models require an explicit `PI_GOAL_TEST_MODELS_FILE` path.
No host models or extensions are discovered implicitly. The selected extension
owns its normal/drafting tool profiles. `PI_GOAL_TEST_EXTENSION` may point to an
installed package directory as well as a source entry point.

The native executable check covers direct startup, public pause/readback,
queued-work timeout, provider failure, scheduled abort and invalid configuration.
Malformed JSON or unsupported compaction settings fail instead of being ignored.
`compaction.json` uses native `enabled`, `reserveTokens` and `keepRecentTokens`;
the threshold depends on the selected model's context window. C16's obsolete
`thresholdTokens` field was replaced with native settings. A short C16 run may
never reach compaction and cannot count as compaction evidence.

Case membership and historical rubrics are not a claim that every real-model
case passed on this fork. The frozen six-run Qwen acceptance gate is specified
separately in plan.md D6 and ticket 013; the optional cases do not substitute for it.

## Supported case matrix (enforced)

`SUPPORTED_CASES.json` is the machine-readable list of supported cases
(B1-B2 + C1-C26 after migration) and is ENFORCED: `run.sh <case-id>` requires
exact membership in the `supported` array before any directory is resolved.
Running a raw case directory (one that is not in the matrix) requires the
explicit diagnostic flag `--allow-unsupported`:

```bash
bash harness/run.sh C20-core-tool-selection --count 3 --grade --no-smoke   # supported
bash harness/run.sh ./cases/C21-my-experiment --allow-unsupported          # diagnostics only
```

The provider smoke check uses the selected `PI_GOAL_TEST_MODEL` (not a
hardcoded one), validates the HTTP status and JSON shape, and caps reported
response text. The outer run timeout is portable: it discovers `timeout`,
then `gtimeout`, then a bundled Node watchdog (`harness/watchdog.mjs`), and
fails with a clear prerequisite message when none is available.

Experiment outputs under `runs/` are generated artifacts and are not part of the package release. Observation files under `observations/` are historical evidence, not instructions; see `observations/INDEX.md`.
