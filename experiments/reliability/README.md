# Frozen Qwen acceptance

`run-qwen.mjs` implements plan D6 with the qualified installed tarball. It never
installs a package or changes live Pi settings. Commit the fixture and driver,
then freeze a new matrix directory before any provider request:

```sh
node --experimental-strip-types experiments/reliability/run-qwen.mjs freeze MATRIX QUALIFICATION_JSON INSTALLED_PACKAGE MODELS_JSON
node experiments/harness/watchdog.mjs 1830 node --experimental-strip-types experiments/reliability/run-qwen.mjs run MATRIX 1
```

Run numbers 1–6 exactly once, even if an earlier run fails. The manifest fixes
both local model IDs, off/low/low thinking, seeds 101/102/103, 65,536 context,
8,192 maximum output, temperature 0.2, top-p 0.95, Pi/Node versions, six contracts,
independent expected outputs and hashes of source, model configuration and every
installed package file. Expected answers stay outside the executor project.
Each project is under `~/Developer/scratch`; isolated agent state and evidence
are under MATRIX. The model configuration's credential command is neither
copied into the manifest nor logged.

After the public parse and aggregate completions, the native `turn_end` event
starts public manual compaction, then `/goal-resume`. After normalization, the
observer appends a frozen non-instructional color sequence to the actual tool
result. Pi owns threshold detection and summarization. The run must produce
native manual/threshold/manual events with real summaries; ballast alone does
not pass. Compaction settings retain 512 recent tokens and reserve 16,384.

The driver limits each run to 60 executor stream responses, 30 minutes including
audit/checks, and two extension recoveries. Pi's immediate retries remain enabled
with a cap of two. The extra 30 seconds in the outer watchdog allows failed-run
cleanup; it never extends the acceptance deadline. If the watchdog kills the
process before `result.json` exists, retain `started.json`, stdout/stderr and the
watchdog exit code and record a failed scheduled outcome. Do not rerun that slot.

`events.ndjson` records actual provider bodies/responses, native events, tool
results and compactions. `result.json` contains exposed usage (including auxiliary
summary/auditor usage), transitions, final state and artifact-check outcome.
Acceptance checks the original outputs, a separate six-row fresh-input probe,
the executor's executable checks, documentation, six contracts, single completion
transitions, enabled auditor approval and exactly one archived completed record.
Final artifact comparisons run after both executable verification commands,
so their writes cannot invalidate an earlier successful comparison unnoticed.
The matrix passes only at 6/6. A repaired candidate needs a new numbered matrix;
retain every earlier result.

Run the native rehearsal before freezing:

```sh
node --experimental-strip-types --test tests/goal-qwen-driver.test.ts
```

Its local synthetic provider exercises native compaction, rejected incomplete
execution, the full verifier/auditor/archive path, and rejection of artifacts
corrupted by a passing executor test. An observable effect proves nested tests
actually execute. Its deliberately scripted
artifacts test verifier plumbing, not CSV implementation or real-model ability.
Reports use `REHEARSAL_PASS`/`REHEARSAL_FAIL`, never the D6 result labels.
