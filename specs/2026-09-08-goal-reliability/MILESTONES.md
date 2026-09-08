# Goal reliability milestones

- 2026-09-08: Read current upstream guidance, the prior failure evidence,
  Anthropic's SDLC playbook, and applicable installed engineering skills.
- Clarification: the package implements persistent goals; SDLC is solely the
  development process for its fork. No SDLC package feature is planned.
- Prepared intent, spec, plan, glossary, ADRs, tracker, and draft tickets in
  disposable staging before the remote fork operation. Upstream base:
  fe430b251eeaff4ff7c041085fd05458b2776cb9.
- Product implementation and test-seam approval are pending. No code or new
  product tests were written as part of this planning checkpoint.

- Planning packet checks passed at 2026-09-08T16:39:24.449Z, before the GitHub fork was created at 2026-09-08T16:39:42Z. All 24 staged document hashes matched during transfer.
- Created https://github.com/justinbeausoleil/pi-goal-x as a fork of tmonk/pi-goal-x and cloned it under ~/Developer/tools/pi-goal-x. Both remote main and the local base matched the reviewed commit.
- Prepared docs/goal-reliability-plan for document review. Runtime code, existing tests, dependency manifests, workflows, and MIT license are unchanged.
- Documentation validation passed: local links, G1–G9 ticket coverage, seven
  draft tickets and their ordered blocking edges, glossary-only CONTEXT.md,
  exact CLAUDE.md import, and preserved upstream instructions. Staged diff
  whitespace passed. The 25 changed files are Markdown only; runtime paths,
  tests, manifests, workflows, and license match the reviewed base exactly.
- No runtime tests were rerun for this documentation-only change. Existing
  triage outcomes are cited as baseline evidence, not as proof of fork repairs.

- 2026-09-08 ticket red team: reviewed the planning commit f8dfb23 against the
  unchanged upstream source and original PRD/runtime-follow-up stages.
  Independent standards and specification reviews found seven agent-readiness
  findings and six lifecycle-coverage findings; all received explicit document
  resolutions. A second pass resolved draft tombstones, cross-path task
  reopening, external scope edits, branch-bound drafts, archival restart
  recovery, and tweak status semantics.
- Replaced the seven broad draft tickets with 14 narrower drafts; expanded
  G1–G9 to G1–G13, added D1–D6 public/ownership/validation contracts, a complete
  source-backed phase matrix and original-stage mapping, and proposed ADR 0004.
  Preserved historical records and mapped old ticket IDs to their replacements.
- Document validation passed: 14 unique tickets, G1–G13 covered, all blockers
  point to existing lower-numbered tickets (acyclic), local links/anchors
  resolve, exact CLAUDE.md import retained, and git diff --check clean.
  The source, tests, scripts, manifests, CI, and license still match fe430b25.
  No runtime test or real-model trial was run in this document-only review.
- Isolated package qualification now precedes the fixed six-run Qwen matrix;
  adoption preparation is independent of live-install permission. The user
  authorized this red-team/document repair; implementation approval and
  runtime acceptance remain pending.

## 2026-09-08 implementation approval and start

- The maintainer explicitly approved the reviewed baseline
  7ac9380e9c25285125d6c2ef4c8b94b1818dd3f5: specification, D1–D6, S1–S3,
  all 14 tickets, and ADRs 0002–0004. Earlier pending-approval entries above
  remain historical. No implementation criterion is satisfied by approval.
- Authorization includes dependency alignment, isolated installation/rollback,
  fixed local-Qwen trials, documentation, commits, and pushes to origin's
  implementation branch. No live package selection, main mutation, npm
  publication, external issues/messages, or upstream contribution.
- Inspected clean repository at reviewed baseline; origin is the user's fork,
  upstream is the reference. Created feat/goal-reliability from the reviewed
  commit without changing main. Read all canonical records and tickets.
- Current ticket: 001, Codex as sole writer. Plan: port S1 startup reproduction,
  align Pi 0.85.1, repair public custom-start context/guards, verify all starts
  and stale-trigger cases, then fixed-base independent standards/spec review.
- Acceptance and all runtime evidence remain pending; next eligible ticket
  after 001 is 002. The complete G1–G13 / 001–014 scope remains unchanged.

### Ticket 001 implementation checkpoint (review pending)

- Pi development/peer dependencies now pin 0.85.1; installation used lifecycle
  scripts disabled. No live Pi package/configuration changed.
- Ported the lab's real-loader/stream-provider startup seam into
  `npm run test:lifecycle`, also discovered by `test:all` in a child process
  without SDK substitutes. No goal-file seeding or manually fired startup hook.
- Red: `/tmp/pi-goal-001-red.log` records `npm run test:lifecycle` against
  unchanged upstream runtime on Pi 0.85.1: one request, zero before_agent_start,
  missing objective. An earlier harness attempt failed because structuredClone
  cannot copy tool functions; switched to JSON capture before reproducing the
  product failure. Both attempts remain in this log's history description.
- Repair: per-response ephemeral context; message-start checkpoint identity,
  dispatch reconciliation, ordinary-user chain reset, and rejected-checkpoint
  continuation suppression. Removed dynamic system goal state.
- Stronger red: `node --experimental-strip-types tests/goal-lifecycle-worker.mjs
  reject-malformed` dispatched an unauthorized fixture write when malformed
  content borrowed the active ID. Matching marker/metadata identity repairs it.
- Green: 10 real-host cases cover four direct/guided regular/ordered commands,
  explicit create_goal, second checkpoints, and stale/malformed/paused/replaced/
  unfocused markers followed by ordinary user work. Actual write/read results,
  projection content, tiny checkpoints and non-persistence are asserted.
- The first inherited full run after moving context had six failures in tests
  asserting the old system-prompt location. Their budget/unfocus/stale behavior
  assertions now inspect the context hook. Targeted checks: 22/22; typecheck and
  lint passed after fixing a test result type annotation.
- Validation logs are retained outside Git under
  `~/Data/pi-goal-x/reliability/001/`. Full gates and independent fixed-base
  standards/spec review are running; 001 remains in progress. Aggregate bounds
  and repeated compaction belong to 002; no later requirement is claimed done.

### Ticket 001 independent review and payload gates

- Fixed-base independent review of `4c0f23d...169b790`: standards reported no
  hard breaches, two smell judgments (colliding invalid-ID sentinel and
  duplicate reconciliation); specification reported two reproduced defects
  (incomplete legacy marker accepted and custom-run budget wrap-up omitted).
- Repairs use an empty checkpoint identity, which actionable-goal validation
  always rejects; reconcile once in the context handler; require complete
  supported marker syntax; project same-goal stopped lifecycle instructions.
  The new actual-host prefix/budget cases both failed before repair. The budget
  follow-up exposed an inherited display bug: clamped remaining-budget cannot
  report overshoot, so the wrap-up now computes the signed balance locally.
  Accounting helpers retain their established clamped-remaining contract.
- Real-host suite now passes 12/12, including 220 tokens against a 200-token
  budget with a 20-token overshoot, one wrap-up, and no subsequent work tools.
  Typecheck passes. Review reproductions and failed repair attempts remain in
  the external 001 evidence directory; follow-up review is pending.
- Initial full qualification: typecheck, lint, 971 tests, runner self-check,
  provider cross-check, NAF benchmark gate, package dry run and production audit
  passed. Context gate failed because state moved from system to messages.
- Updated the context measurement surface and retained its semantic assertions
  over decoded automatic goal text, added mandatory active-projection presence,
  and prohibited dynamic system state. Regenerated 24 fixtures with the D1 /
  ADR 0003 rationale documented in experiments/context/README.md. No size limit
  increased. Serialized total: 242142 -> 244730 chars; extension-attributable
  total: 130042 -> 132591; child requests: 15225 -> 15230 (Pi 0.85.1 guidance).
  `context:gate` now passes, including unchanged single-objective/contract and
  checkpoint-history rules. Full post-review qualification is running.
- Ranking updater: `uv run --no-project python -B scripts/test-update-ranking.py`
  passed all five tests. A separate detached upstream worktree at fe430b25 under
  ~/Developer/scratch is rerunning clean locked baseline installation/checks;
  this replaces any ambiguity from the early dependency-alignment timing.

- Follow-up review at 3ac2d4c: both specification findings resolved; both initial
  standards findings resolved. One additional standards finding reproduced:
  decoded semantic counting omitted native compaction/branch summary text.
  Added a red-capable probe to the existing context gate and now use Pi's
  native convertToLlm conversion. The two-summary duplicate-marker probes and
  all 24 fixtures pass without another baseline change; provider cross-check
  and lint rerun for this measurement-only fix.
- Post-review runtime qualification at 3ac2d4c passed all nine npm commands in
  `~/Data/pi-goal-x/reliability/001/review-checks.json`, including full tests and
  self-check, both context gates, NAF benchmark, dry pack and production audit.
  Clean upstream fe430b25 installation/check/typecheck/full tests also passed:
  961/961 tests with its locked original dependencies. Main remains unchanged.

### Ticket 001 complete; ticket 002 frontier

- Final standards follow-up at 5619d5f verified native-summary measurement and
  reports no remaining issue. The specification follow-up at 3ac2d4c reports
  both findings resolved. All five review findings are closed; the separate
  reports and evidence are in docs/reviews/2026-09-08-ticket-001.md.
- G1 / 001 acceptance is now checked against actual host requests, work effects,
  public results, persisted markers, all four command starts, explicit tool
  creation, malformed/stale/paused/replaced/unfocused triggers and ordinary
  user work. Required current gates pass; no later gate is marked complete.
- Implementation branch feat/goal-reliability was pushed to origin at 3ac2d4c;
  the measurement/review records are being pushed in this checkpoint. Main and
  live Pi package selection remain unchanged. No package has been qualified
  for adoption and no Qwen matrix has begun.
- Next eligible ticket: 002, now in progress. Reread its D1/ADR0003 acceptance
  and public task/compaction paths. First step is a public-tool off-preview
  task reproduction and three actual manual/threshold/overflow compactions,
  then aggregate text bounds and state/pairing/duplicate-continuation proof.

### Ticket 002 implementation checkpoint (verification/review pending)

- Added a real-loader compaction worker using public set_goal_tasks and
  update_goal_task, actual write/read effects, native session.compact and Pi's
  threshold/overflow paths. Three completed transitions survive; execution
  advances through off-preview tasks t40/t41/t42 and their t39 ancestor.
- Baseline fe430b25 source loaded by the current Pi host loses t40 after native
  compaction while the public result still reports currentTaskId=t40. The
  red is retained in reliability/002/baseline-off-preview.log outside Git.
- Manual, threshold and overflow scenarios each crossed three compactions;
  threshold occurs three times within the same agent run. Expected persisted
  checkpoints are five/manual and two/threshold or overflow, with exactly
  three writes. Native summaries deliberately omit task identity/status;
  tool-call/result pairing and unrelated extension context are checked.
- Fixture failures retained: oversized trailing ballast gave Pi no valid cut
  point, so threshold initially did not run. Use reported provider usage and
  a tail below keepRecentTokens; manual stopped-state compaction needs a fresh
  ordinary boundary after large tool results. These were fixture failures.
- Product red: a public agent pause injected 68,697 characters after compaction.
  Bound pause/block/action/audit excerpts with history locators; reserve room
  by omitting optional pending previews from large active projections. Add
  current-task ancestry and stopped-state task counts; budget stop instructions
  persist after the one-time wrap-up. No durable objective/task data is clipped.
- Oracle context red: pending advice vanished beyond the recent ledger tail.
  Persist its complete structured result as optional oracle_result.advice JSON text, then
  project a bounded excerpt with a lossless history locator until the recorded
  follow-up attempt. Legacy summary-only records explicitly disclose missing
  full advice. Ticket 009 retains ownership of the complete disposition,
  fingerprint/reopen and failure/cancellation matrix.
- The real child-provider scenario invokes the native Oracle and auditor via
  a loopback SSE provider, compacts their chat results, and checks their advice
  and rejection in the next executor request. Parent goal tools/context stay
  absent from child requests; Oracle tools remain read-only. Long objectives,
  task titles/contracts, rejection and pause fields share the aggregate cap.
- Intermediate checks: expanded lifecycle suite 20/20, helper Oracle/history
  red then green, typecheck/lint, and inherited full suite 982/982 passed before
  the final child/ancestor additions. Latest full qualification and independent
  fixed-base reviews remain pending. Context baseline intentionally changes
  four stopped/rejection fixture breakdowns, documented in its README.
- Evidence is under ~/Data/pi-goal-x/reliability/002/. A fixture also exposed
  completion reading project-only auditor settings despite resolved global
  settings. The fixture uses explicit project settings; retain this behavior
  as an open completion/settings issue for 011/012, not a passing global-settings
  claim. All original tickets and final Qwen/package gates remain required.
- Follow-up real-host stall red: moving detection into context let turn_start
  reset the activity clock first. Capture the one-shot notice before that reset
  and deliver it only for the matching active goal. The controlled-clock native
  compaction case fails before repair and passes afterward (stall-context-*.log).
  Latest expanded lifecycle run was 21/21 before adding that 22nd scenario.
- Independent review of c3a87a6...6a98176: Standards found stale architecture
  documentation and a ledger-boundary smell in the automatic full-history Oracle
  scan. Spec reproduced missing stopped-state goal contracts and missing audit
  rejection in blocked/budget-limited projections. The standards reviewer also
  identified malformed-checkpoint overflow: Pi catches context-handler errors
  and can dispatch the original context, so throwing cannot replace bounding.
- Review repairs: shared stopped-state contract/task/budget projection and
  rejection guidance; latest Oracle result in the existing ledger index, with
  old-checkpoint rebuild and public history retrieval proof; architecture updated.
  Rewrite every goal checkpoint, including malformed/missing IDs, and reject
  oversized checkpoint identities before context construction. Both malformed
  marker variants and the short-objective contract case have retained actual-host
  red/green logs. Native blocked and budget-limited auditor cases pass after
  repair; follow-up independent review remains pending.
- Qualification at 6a98176: check/lint/selfcheck/NAF gate/dry pack/audit passed;
  context gate and provider cross-check passed sequentially. A concurrent attempt
  collided because both inherited capture tools share /tmp/goal-context-capture;
  review-4/5.log retain those failures and review-4/5-serial.log the successful
  reruns. Run these two tools serially. Full-suite completion and final repair
  checks still need recording. 002 remains in progress.

### Ticket 002 complete; ticket 003 frontier

- Both independent follow-ups at 32e8f188 cleared all ticket-002 findings.
  The Spec reviewer independently reran five native regressions successfully.
  Separate reports: docs/reviews/2026-09-08-ticket-002.md.
- Final qualification at 32e8f188: check/lint, 988/988 full tests across 76
  discovered files, self-check plus 916 unit tests, NAF gate, dry pack, and
  production audit passed. The 24-fixture context gate and six-payload SDK
  cross-check passed sequentially at identical product code (5af76d98).
  Exact commands and evidence: reliability/002/review-checks.json under Data.
- All 002 criteria now have actual-host evidence, including three successive
  manual/threshold/overflow compactions and stopped-state/child/context bounds.
  No 200-node, full Oracle lifecycle, package compatibility, real-Qwen, or live
  adoption result is implied. Those gates retain their original ticket owners.
- Migration regression initially lacked a materialized checkpoint (ENOENT);
  32e8f188 corrects the fixture and the final suite includes the passing case.
- Implementation and these records are being pushed on feat/goal-reliability.
  Main and live Pi selection remain unchanged. Ticket 003 is now in progress;
  006 is independently eligible. Next: trace task tools/service, establish
  public incremental-plan and work-revision red tests, then implement D2.

### Ticket 003 implementation checkpoint (not yet qualified)

- HEAD remains 9a16d35 (pushed); the working tree contains the first D2 changes.
  Public native-host test now builds 180 nodes in 50/50/50/30 batches, writes an
  actual evidence artifact, completes t1 and starts t175, appends 20, moves and
  edits the current task, rejects invalid operations atomically, and reopens
  the same paused session with all 200 IDs and completed evidence intact.
  Latest proof: reliability/003/public-atomic-green.log (28 requests, one write).
- Added content work revisions without storage-format changes; accounting and
  timestamps are excluded. Public missing/stale writes have a retained red then
  green. Validation runs inside the existing mutation paths as well as before
  structural confirmation. Existing numeric storage CAS remains independent.
- Whole-record structural mutation now rejects removing/changing contracts or
  editing completed-task requirements until 005 supplies human scope revision.
  This applies to set_goal_tasks and tweak alike. Legacy tests that asserted
  changed requirements could keep completion are being updated to assert the
  new rejection plus unchanged-requirement preservation; no test was deleted.
- Initial full suite exposed old test clients omitting the deliberately new
  expected_work_revision input. Existing clients now explicitly read it through
  get_goal; the actual compaction worker reads it from outbound projection.
  All-first.log retains the pre-migration failures. Manual native compaction
  passes after protocol migration. New revision/rejection tests call the raw
  tools so missing/stale inputs cannot be silently supplied by a harness.
- Failed fixture attempts are retained: JavaScript undefined-property shape
  mismatch (normalized to its public JSON representation), an invalid-member
  case hitting the capacity gate first (moved before the 200-node append), and
  a tweak fixture whose initial objective also included success criteria.
- A manual targeted command used the benchmark adapter and failed an unrelated
  Unicode ledger-tail assertion; the same test with the native SDK passes.
  Use the repository test runner / correct test adapter for qualification;
  do not claim this benchmark-adapter run as a production regression or weaken
  that assertion. All raw logs remain under ~/Data/pi-goal-x/reliability/003/.
- Remaining 003 work: explicit sibling/root/replacement and stale-confirmation
  proofs, complete public textual revision exposure, finish caller migration,
  inspect UI task callers, documentation, full required gates and independent
  fixed-base review. 003 criteria remain unchecked; later tickets unchanged.
- Follow-up proof adds stable sibling edits, input-ordered moved siblings,
  parent_id=null root appending, and a complete 200-root replacement preserving
  progress/current task. Public-order-green.log passes with 32 requests and
  one effect. A two-client public-tool confirmation test proves a concurrent
  completion invalidates the proposal; a cancelled replacement writes nothing.
- Caller tracing found UI evidence dialogs accepted a changed contract or a
  paused goal. Both cases reproduced, then passed with a captured work revision
  and fresh lifecycle validation in the existing task mutation module. The
  original TUI completion/reopening characterization also passes.
- Existing clients now pass revisions explicitly; the repository runner passed
  all 992 tests before the two final UI-race cases. The proper targeted test
  adapter passes all 108 migrated tests. Type checking exposed a test-only
  unknown result shape and partial harness context; explicit typed extraction
  repairs those without changing runtime checks.
- D2 revision/schema bytes intentionally change 22 context-fixture breakdowns;
  documented rationale in experiments/context/README.md. All semantic counts,
  child-request measurements and the 10,000-character cap remain unchanged.
  Sequential context gate and six-payload provider check pass. Final current
  checks are running in reliability/003/review-0 through review-6.log.
- During review, local preservation tracing found parent-skip cascades left a
  skipped descendant selected as current in buffered public results. Added a
  red/green test through public progress tools in an open turn, plus passing
  lightweight-child preservation. The shared current-task resolver now clears
  terminal descendants too, so immediate, single, and ordered batch paths agree.
