# 012a: align the existing experiment launcher with Pi 0.85.1

**Status:** in-progress — implementation verified; parent qualification/review pending.
**Parent/acceptance owner:** 012 (G9/G13, native S1).
**Requires:** the pinned Pi0.85.1 dependency alignment from001.

The documented experiment launcher fails before argument handling because
AuthStorage/ModelRegistry are no longer SDK exports. Its shell tests replace
the driver and therefore cannot detect this. Keep the existing case matrix and
launcher; do not build a new experiment framework or run real models here.

- [x] Use the installed SDK's ModelRuntime and actual extension/session binding,
  with isolated run state and explicit configured credentials/models.
- [x] Drive the executable against a deterministic local HTTP provider; confirm
  a direct goal reaches its real executor and honors a public pause.
- [x] Preserve command chaining, finite timeout/abort behavior and honest failure
  status; malformed configuration cannot silently become a successful trial.
- [x] Retain shell harness checks and correct current documentation/support
  metadata. Live Qwen acceptance remains013 and uses its fixed contract.

Red: `node experiments/harness/drive.mjs` exits1 with a missing AuthStorage
export, rather than reaching its usage check (Data012/harness-sdk-red.log).
Original upstream API usage is retained as failure evidence. No real provider
was called. No new package/product behavior is requested by this child.

Native executable regression: `node --experimental-strip-types --test
tests/goal-harness-shell.test.ts` passes both tests, including direct startup,
public pause/readback in a second prompt, queued executor timeout (exit124),
malformed env/compaction JSON, invalid timeout, provider401 failure (exit1),
and intentional scheduled abort. The inherited shell checks still pass.
Exact logs: Data012/harness-native-red.log (removed export),
harness-drain-red.log (ignored deadline), harness-config-red.log (silently
ignored malformed configuration), and harness-final.log (2/2, 4117ms).
Type checking, lint and whitespace checks pass after the repair.

The first positive fixture assumed pause would generate a final assistant
response; native pause correctly aborts that response. The fixture now requests
get_goal on the next user prompt and verifies the persisted paused record.
Historical optional cases/rubrics remain. C16's unsupported thresholdTokens
configuration now uses native reserve/retention settings; a run that never
compacts supplies no compaction evidence. No rubric assertion was removed or
relaxed, and no optional real-model case or S3 trial was run for this repair.

Independent spec review of9190336 found a legitimate no-work yield incorrectly
timed out while the disk goal stayed active. The added native clarification →
/goal-pause chain reproduces exit124, then passes after the launcher uses Pi's
idle/queue state and reserves its delayed-recovery wait for provider failures.
Data012/harness-yield-red.log and harness-yield-green.log retain both outcomes.
The repaired combined fixture passes2/2 in4738ms; re-review remains pending.

The follow-up spec review cleared yielding but reproduced a sibling error path:
an active-goal HTTP401 was incorrectly treated as delayed recovery. The driver
now reuses the candidate repository's existing transient/aborted-message classifier
through Pi's TypeScript loader. Active and unfocused authorization errors both
exit1 with their diagnostic; eligible recovery retains its bounded wait.
The registered fixture also exhausts Pi's two immediate retries, waits beyond
the quiet window for one extension recovery, and observes a second real goal
checkpoint followed by public pause. No classifier or retry policy was copied.
Data012/harness-active-error-red.log and harness-recovery-green.log preserve
red and green; the combined2/2 checks pass in11838ms. Final re-review pending.

The installed-package checks caught a harness import-resolution mistake:
directly importing a helper beside the isolated package bypassed Pi's peer
aliases. The harness now imports its own candidate source helper; the packed
runtime is byte-identical, and no competing extension is registered. Native
executable checks against the actual installed artifact pass on Node22.15.0
and24.0.0 (2/2 each,12325/12428ms). Both the failed first checks and repaired
logs remain in Data012/attempt-03/harness-node-*.log.
