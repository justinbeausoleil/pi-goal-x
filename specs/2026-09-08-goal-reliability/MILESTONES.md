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
- Independent Standards review cleared 9a16d35...3eb7feb and the cc6714f
  descendant-focus repair. Spec review independently passed the 200-node worker
  but reproduced an accounting-only concurrent save discarding the successful
  buffered completion/start batch. The native reproduction is retained as
  concurrent-accounting-red.log; it fails with t1 reverted to pending.
- The existing flush now distinguishes accounting-only revision changes from
  work/control changes under its lock and merges the local usage delta. The
  pre-mutation reconciliation refreshes its base so adopted remote usage is not
  counted twice. Native regression performs accounting saves both before task
  execution and after its success but before flush, verifies exact combined
  tokens and seconds, and reads public history to check single completion/start
  events. It then completes the 200-node proof and reopens successfully.
- The first precise-clock assertion omitted the main session's first two
  elapsed seconds: accounting-final evidence retains that failed expectation.
  Correct independent total is eight seconds (four main, two per other-session
  response), with 110+11 tokens added after the successful result. The final
  native concurrent-accounting-green.log passes (33 requests, one work effect).
  Existing conflict characterization now also covers pause and budget changes;
  41 targeted storage/transaction/progress checks pass. Full qualification and
  independent review of this repair are pending; 003 remains in progress.

### Ticket 003 complete; ticket 004 frontier

- Final follow-ups at 4b900f7 clear Standards and Spec findings. The Spec
  reviewer independently passed the two-session native accounting/200-node
  worker. Separate reports: docs/reviews/2026-09-08-ticket-003.md.
- Qualification: 999/999 full tests across 76 files; self-check plus 925 unit
  tests; check/lint; 41 targeted transaction/progress checks; NAF gate; dry
  package and production audit all passed. Context's 24 fixtures and six SDK
  payloads passed at identical final payload code, sequentially. Exact commands
  and commit references: ~/Data/pi-goal-x/reliability/003/review-checks.json.
- All 003/G3 criteria now have evidence. Required pending scope-revision rules
  remain explicit interim rejection until 005. No installed package, full
  200-node compaction, real-Qwen or live adoption result is claimed.
- These records and implementation are being pushed on feat/goal-reliability;
  main and live Pi selection remain unchanged. Ticket 004 is the current
  frontier; 006 remains independently eligible. Next: exercise public page
  reconstruction and existing confirmation/dashboard/task-overlay navigation,
  then extend actual native compaction proof to 200 nodes with t142 selected.

### Ticket 004 implementation checkpoint (not yet qualified)

- HEAD 7e39724 is pushed and cleanly closes 003; current edits implement the
  first 004 retrieval/presentation slices. Ticket 004 criteria remain unchecked.
- Native public --details proof builds/reopens 200 tasks, reconstructs objective,
  all task rows and individual t142 across 4,000-character Unicode pages, and
  checks unchanged content revisions across accounting writes. It rejects
  malformed/noncanonical, wrong-section, wrong-task, changed-content and
  wrong-goal cursors through public operations. Final proof: 57 requests,
  one real work effect; reliability/004/public-pages-final.log under Data.
- The first red exposed silent 200-character evidence truncation, before it
  reached missing page metadata. Batch, single-task and UI evidence inputs now
  retain the complete trimmed text. Page metadata/text exposes goal, section,
  selected task and content revision. A separate red proved Buffer's permissive
  base64 decoder accepted punctuation; emitted cursors now require canonical
  base64url. All failed attempts remain in the evidence directory, including
  a fixture that needed a second prompt after create_goal terminated its turn.
- Task confirmation previously hid node 17 onward and truncated contracts.
  Its red/green now reaches 200 nodes and 600 Unicode contract tokens through
  the existing questionnaire viewport; set_goal_tasks reuses the existing
  structural renderer so contracts are present in the proposal.
- The expanded dashboard's task viewport plus terminal head-slice hid node 13
  and long current-task requirements. In a bounded terminal, existing navigation
  now scrolls the complete rendered dashboard through the same viewport while
  preserving the latched dock height. 78 widget checks pass, including growth
  from a short contract and 200-node/off-preview navigation. Unbounded/compact
  rendering retains its existing task viewport. Recent-completion reanchoring
  has been carried into the bounded full-content viewport; a focused extra
  characterization should verify it before qualification.
- All three native --large --long --advice-review compaction cases pass:
  200 tasks built in four public upserts; t142/t143/t144 survive three successive
  manual/threshold/overflow compactions, respectively, then a paused manual
  compaction. Three completed evidence artifacts remain intact. Threshold
  compacts inside one run; no duplicate overflow continuation. Aggregate
  automatic text stays <=10,000 characters even with long objective/contracts,
  pending Oracle advice and auditor rejection. Logs: compaction-*-first.log.
- Existing task/feature checks: 37 passed after long-evidence characterization;
  task confirmation/legacy overlay checks: 15 passed; type check passed before
  the last dashboard edits. Remaining: full requirements through existing
  status/overlay/proposal views; native TUI/confirmation reachability review;
  final type/lint/full/discovery and payload/benchmark gates; architecture and
  release notes; fixed-base independent reviews from 7e39724. No 004 completion,
  installed package, real-Qwen or adoption result is claimed.
- Further view checks reproduce absent overlay contracts and inaccessible
  draft-proposal nodes beyond the first two. The retained overlay now wraps
  full requirements/evidence with correct padding width (16 checks pass).
  Draft confirmation retains its initial small-proposal/options frame and
  enters the full viewport on advertised page keys (37 questionnaire checks
  pass). No removed shortcut was restored. The existing verbose status path
  preserves all 200 full titles/contracts and long Unicode evidence.
- The first full 004 suite passed 1010/1010 across 76 files; check/lint and
  discovery also passed. A follow-up compact-to-expanded test reproduced a
  lost recent-completion anchor in the new viewport. The pending anchor is now
  retained across that transition; anchor-red/green.log records the repair.
  The new code still needs final qualification after independent review.
- Combined native --details --concurrent-accounting proof passes (62 requests,
  one work effect), including full public history pages. Seven context fixture
  breakdowns drift only by the evidence schema description's 45 new characters;
  all automatic-text and semantic/child measurements are unchanged. Rationale
  is in experiments/context/README.md; final gate/provider checks are pending.

### Ticket 004 independent review repairs

- Fixed reviewed payload commit: 8adbbba. Standards found no actionable issues;
  Spec independently passed native details/accounting and threshold compaction,
  then found two acceptance misses. The retained overlay sized its viewport
  from width, while the real Pi compositor cropped it to 80% of terminal rows.
  The raw-component tests missed that cropping. A native compositor regression
  now covers all 200 titles and 600 Unicode contract tokens at 80x24, growing
  to 120x40 and shrinking again, for both overlay and task confirmation.
  It failed at node 15 during paging before the fix; viewport height now also
  reserves actual host frame/indicator/diagnostic rows. No shortcut restored.
- Missing-task and invalid-section cursor paths returned before restart
  guidance. They now share the existing invalid/stale diagnostic, including
  an explicitly empty cursor. Native details/accounting proof passes all
  added cases. Red/green evidence: reliability/004/host-overlay-*.log and
  cursor-guidance-*.log under Data.
- Fresh benchmark checks exposed three unmigrated task clients from 003:
  B2/B7 silently timed a rejected completion; runtime-token did not focus its
  final task. Added effect assertions reproduce each failure, then public
  revision reads restore successful mutations. B2/B7 and a runtime smoke run
  pass; runtime's one-event smoke is only protocol validation, not a scale
  claim. No historical measurements or gate limits were changed. The NAF gate
  is a comparison of committed historical artifacts, not a fresh measurement.
- Full 1010/1010 tests and all original review checks passed at 8adbbba;
  context's 24 fixtures and six payload cases ran sequentially and passed.
  Follow-up qualification/reviews remain pending for these repairs.

### Ticket 004 complete; ticket 005 frontier

- Both independent follow-ups clear 5046e7b; Spec independently reran native
  host rendering, details/accounting (65 requests, one effect, reopen), and
  all 16 overlay/confirmation checks. Reports: docs/reviews/2026-09-08-ticket-004.md.
- Final qualification: 1011/1011 full tests across 76 files; discovery plus
  932 unit tests; check/lint; five ranking checks; dry pack; production audit
  (zero vulnerabilities); historical NAF gate. All passed. Context's 24
  fixtures and six payload cases passed sequentially at unchanged payload code.
  Fresh B2/B7 ran 53 rows with successful mutations, zero threshold regressions
  and a passing no-network/process exclusion guard. Commands and results:
  ~/Data/pi-goal-x/reliability/004/review-checks.json.
- 004 criteria are verified. Code commits 8adbbba and 5046e7b and completion
  records are being pushed to origin/feat/goal-reliability. Main and live Pi
  selection remain unchanged. No packaged/Qwen/adoption success is claimed.
- Next: 005. Trace the existing draft/session/dialog and mutation paths;
  reproduce branch replacement, proposal-cancel and stale-dialog failures,
  then add retained scope and human-bound revisions through GoalService.
  The approved D3 lifecycle and all 005 criteria remain authoritative; 006
  remains independently eligible. No new approval or planning gate is needed.

### Ticket 005 draft lifecycle checkpoint (partial implementation)

- 004 is pushed at a73ecb1. Current 005 work traces existing draft commands,
  basic/terminal questionnaires, draft entries, session-tree loading and the
  shared focus/work-revision boundaries. No 005 criterion is marked complete.
- New native goal-draft-worker uses the actual loader, public commands/tools,
  RPC user dialogs, manual compaction, session reopen and navigateTree. It
  reproduced proposal cancellation removing the draft, navigation retaining
  the other branch's live draft, and a returning human confirmation creating
  a goal after /goal-cancel. Red logs: reliability/005/draft-*-red.log under Data.
- Rehydration now replaces memory from the selected branch's latest valid
  entry/tombstone. Question/proposal cancellation retains the discussion;
  explicit cancellation remains a tombstone. Questionnaire answers now travel
  with the durable draft alongside auditor choice. Every awaited drafting
  decision uses the existing focus generation plus work revision and captured
  draft identity, preventing stale confirmation or answer application.
- Six native cases pass (cancel/branches/stale in regular and Sisyphus modes):
  cancellation through real compaction/reopen; two live branches and a tombstone;
  selected-branch confirmation; preserved auditor choice; read-only research;
  no unconfirmed goal file. Type/lint and 82 drafting/questionnaire checks pass.
  The first targeted run retained one old expected 'Draft cancelled' string;
  it now asserts the approved proposal-cancel/keep-draft behavior and passes.
- Remaining 005 work includes active-draft continuation characterization,
  detached-fork behavior, full work/generation race coverage, retained-scope
  schema/migration and receipts, public scope pages, deterministic reopening,
  human-only 200-node before/after revisions, external-edit proposals, all
  lifecycle/setting preservation and qualification/review. Scope completion
  judgment remains 011. No package, Qwen or adoption acceptance is claimed.

### Ticket 005 native host fork and active drafting follow-up

- Interim Standards and Spec reviews cleared a73ecb1...fec25f3 for the completed
  draft subset. Spec independently passed the native cases and two additional
  probes: branch-specific questionnaire echo and navigation during the draft
  replacement selector. Both probes are now permanent worker coverage.
- The worker now uses Pi's actual AgentSessionRuntime for reopen/fork, including
  shutdown and emitted session-start reasons. A native fork preserved a live
  tweak and inherited focus. On reason=fork, the extension now appends explicit
  null focus before rehydration/continuation, using existing focus mutation
  with no project-ledger event. Normal discussion inheritance passes; detached
  tweaks are tombstoned. 006 still owns the remaining ownership table.
- An initial fork comparison included the outgoing host's ordinary shutdown
  save (only updatedAt/revision changed), so exact pre-shutdown byte comparison
  failed after the authority fix. The passive observer now captures after that
  outgoing settlement and before the fork runtime exists; every resulting
  approved-goal byte must equal that boundary snapshot. Failed attempts remain
  in draft-fork-tweak-*-green.log despite their provisional filenames; actual
  passing evidence is draft-fork-tweak-followup.log and its Sisyphus counterpart.
- Active tweak refinement exposed 64 autonomous checkpoint dispatches in a
  150ms native observation window. The shared actionable predicate now excludes
  drafting, protecting both scheduling callbacks and stale work dispatch.
  Draft-active-refine-boundary.log retains the red; followup logs show zero
  checkpoint dispatches. Approved lifecycle status is unchanged.
- Native matrix now has nine scenarios in each mode: cancellation, two branches,
  stale proposal/question/questionnaire, stale replacement selector, discussion
  fork, detached tweak fork, and active refinement. Follow-up native scenarios,
  86 targeted drafting/questionnaire/task/session checks, type and lint pass.
  Final slice review/qualification and retained-scope work remain outstanding.

### Ticket 005 continuation review repairs (partial)

- Full tests at aa9ace1 passed 1029/1029 across 76 files. Independent Spec
  then reproduced explicit /goal-cancel during an active tweak allowing the
  old drafting turn to rearm work; Standards found disableTasks changes could
  replace the live drafting tool profile. Neither interim review closes 005.
- Permanent native regressions reproduce 61 unwanted checkpoints after cancel
  and loss of drafting tools through the public settings menu. The first two
  settings probes accidentally consumed dialog choices inside Array.find and
  passed without changing settings; retained logs are not evidence of the bug.
  active-settings-public-red.log is the valid settings reproduction.
- Continuation now checks actual drafting state and a session-local discussion
  hold, independent of the advertised tools. Explicit cancellation preserves
  that hold; confirmation, creation, or explicit focus/resume releases it.
  Reload restores eligibility under D4, with live drafts reinstating the hold.
  The shared profile installer preserves an active draft while updating the
  effective task setting. No approved lifecycle or scope is changed by cancel.
- Native checks include cancel through manual compaction, unchanged approved
  status/objective, one explicit resume, settings changes, and both goal modes.
  An initial resume check omitted the required pause reason; the public tool
  correctly rejected it, and the corrected fixture supplies the reason.
  Type/lint and 110 targeted drafting/settings/session checks pass. Final native
  verification and independent review follow; retained scope remains next.

- The 21a7bea follow-up cleared the settings repair but Spec reproduced one
  more cancellation path: the same drafting run could write after a returning
  stale proposal, before settlement. Zero checkpoints alone missed this.
  draft-cancel-dispatch-red.log records the unauthorized file; the regression
  now attempts that actual write, checks the host's blocked result, and proves
  a fresh ordinary user request can still write after cancellation.
- The event boundary retains discussion identity through cancellation and
  gates every work-tool dispatch, allowing drafting and read-only research.
  Per-response context now explains the discussion hold instead of instructing
  work on the approved active goal. The initial context assertion inspected
  custom messages after Pi had converted them and failed at the wrong boundary;
  draft-cancel-provider-payload-red.log is the corrected red against actual
  provider content. All failed/provisional logs remain under Data/005.
- Standards requested architecture documentation for the hold's ownership,
  release and reload behavior; docs/architecture.md now records them. Two
  context baselines gain only the 226-character no-goal discussion instruction;
  the rationale and a new drafting invariant are in experiments/context/.
  Semantic counts and all ceilings are unchanged. Qualification/review pending.

- Full ac75921 qualification passed 1033/1033 tests across 76 files; Standards
  cleared the dispatch repair. Spec independently passed cancellation in both
  modes, then found the early discussion return omitted current pause/block
  reasons. Native paused-refine and blocked-refine fail on that omission.
  Discussion is now the active prompt's base, preserving shared Oracle/stall/
  compaction additions; stopped goals retain their existing lifecycle branches
  plus the discussion hold. Native tests require current reasons and the paused
  suggested action, with lifecycle unchanged and zero autonomous checkpoints.

### Ticket 005 retained-scope checkpoint (implementation incomplete)

- Both independent axes cleared the draft repairs at 6f39a58. That commit and
  its preceding draft commits are pushed to origin/feat/goal-reliability.
  Full tests at ac75921 were 1033/1033; the final stopped-context repair passed
  40 native draft/startup cases, type/lint, 24 context fixtures and six provider
  checks. This closes the reviewed draft subset, not ticket 005.
- Working-tree scope implementation adds optional retainedScope metadata,
  strict parsing (absence remains legacy; invalid scope is not silently dropped),
  clone isolation and timestamp-free work identity. The effective legacy scope
  participates in work identity so first-write accounting migration does not
  invalidate a task revision. GoalService creates/refreshes the snapshot in
  every existing immediate/buffered mutation and persistence path.
- get_goal section=scope uses the existing Unicode-safe 4000-character pages.
  Native scope cases in both modes create contracts, record long evidence,
  reopen and reconstruct every field. The first provisional green log failed
  only because its expected JavaScript object retained undefined fields that
  JSON correctly omits; the corrected serialized expectation passes.
- Public structural deletion now retains contracted-task progress/evidence;
  old 003 deletion rejection coverage now tests forbidden contract clearing,
  with deletion-preservation asserted separately. Completion cannot waive an
  unresolved retained task via skipping, plan removal, auditor bypass, or
  disableTasks/disableContracts. Native red shows hidden contracts allowed
  evidence-free task completion; shared service validation now rejects it in
  single and batch progress paths. Recreating the original ID/contract and
  supplying evidence works and preserves the other removed task's proof.
- Both native scope cases pass (34 requests each), the public 200-node plan
  with concurrent accounting passes, and 101 targeted service/record/task/draft/
  transaction checks passed before the latest evidence guard. Immediate and
  buffered migration checks preserve legacy bytes on reads/rejected writes
  and keep work_revision stable on the first successful accounting write.
  Evidence: ~/Data/pi-goal-x/reliability/005/scope-*.log. The earlier targeted
  command named two nonexistent test paths (Node ignored them); its 67 count
  covers the discovered service/drafting files only. The 101 run uses real paths.
- Next: inspect scope-first-full.log (full suite running at this checkpoint),
  repair any required fixture updates/regressions, add automatic scope locators,
  qualify scope paging/migration and review the slice. Still required for 005:
  human-bound scope revision and durable receipts, 200-node before/after UI,
  completed-task reopening across structural paths, external-edit proposals
  with preserved body/authority, receipt survival on ledger failure, remaining
  lifecycle races and final checks/reviews. No 005 checkbox is complete.

### Ticket 005 retained-scope qualification (partial)

- The first full scope run failed eight cases: legacy normalization added an
  observable undefined property, and seven compaction fixtures attempted audit
  or completion with contracted tasks still pending. Normalization now preserves
  the legacy shape. Those fixtures retain their three native compactions,
  current-task/count/200-node assertions and child isolation. They now create
  and independently inspect audit-evidence.json, then complete required tasks
  through ordered public batches before the final audit/complete attempt.
  Rejection is obtained before planning and again after qualification; the
  latter auditor request must contain the complete 50/200-task plan.
- A recreated removed ID could initially supply a weaker contract because the
  structural guard examined only current nodes. scope-recreate-contract-red.log
  preserves that failure. The shared guard now checks retained entries. Both
  native scope modes pass 39 requests, including special-key IDs, Unicode paging,
  a stale scope cursor after progress, and hidden-contract single/batch evidence
  checks. No structural confirmation or setting waives retained requirements.
- `npm run test:all` passes 1042/1042 across 76 files (scope-latest-full.log,
  80.7s). Type/lint, runner self-check (71 unit + 3 integration + 2 e2e entries),
  24 context fixtures, six SDK provider payload checks, package dry run and
  existing NAF gate pass. The NAF gate uses retained campaign measurements;
  it is not a fresh timing claim. scope-*.log evidence remains under Data/005,
  including all failed attempts. No package installation or Qwen claim is made.
- D2/D3 intentionally add the scope inspection schema and compact retrieval
  reminder. The measured baseline changes 22 fixture breakdowns, with all
  semantic counts and child-request measurements unchanged. Rationale is in
  experiments/context/README.md; all limits remain fixed. Independent reviews
  follow from fixed base 6f39a58. Human receipts/revisions, completed-task
  reopening, external proposals and final ticket qualification remain next.

- Both independent reviewers reproduced first-write migration rejecting a
  second session's already successful buffered task update: equivalent absent
  versus materialized scope failed the accounting-only deep comparison. The
  permanent two-service red records the rejected flush. The comparison now
  uses effective retained scope on both sides while retaining all lifecycle/
  budget/work comparisons. The green keeps completed proof and exact combined
  usage (121 tokens, 8 seconds); service/transaction checks and type pass.
  Evidence: scope-migration-race-{red,green}.log and scope-migration-type.log.

- Spec's pinned public-host follow-up found c9c15b6 restored the raw expected
  scope after normalizing the record. Missing optional keys therefore differed
  from parsed undefined keys and rejected native buffered work. cf9c777 derives
  effective scope from the normalized expected record. Both axes cleared it;
  Spec independently passed the pinned public 200-node/65-request detail plus
  concurrent-accounting/reopen worker and 33 record/service checks. Root's
  scope-migration-native-followup.log used the next uncommitted reopening
  behavior and failed an obsolete completed-title rejection assertion; it is
  not evidence about the pinned repair. All attempts remain retained.

### Ticket 005 human revision checkpoint (implementation incomplete)

- Native 200-node proposal with PI_GOAL_AUTO_CONFIRM=1 reproduced bypass of
  the human scope dialog (scope-tweak-auto-red.log). Tweak confirmation now
  always requires UI, while existing new-goal auto-confirm behavior remains.
  Headless model-supplied approval is rejected for unset/0/1 environments.
  The existing dialog receives complete before/after retained scope and task
  plan. Decision and service commit are bound to focus and work revision.
- Accepted revisions store prior/new full text, user-request reason and
  session/tool/time locator in authoritative metadata. Omitted tasks retain
  current and removed obligations; explicit replacement revises the set. A
  tweak-only nullable verification_contract field permits explicit goal-level
  contract removal; settings never implicitly clear retained contracts.
  Shared structural mutation reopens retitled/recontracted completed tasks,
  clears current evidence/timestamp and preserves unaffected progress.
- Both native modes pass the expanded 200-node flow: cancel then confirm,
  old/new requirements at native RPC UI, durable receipt after reopen, upsert
  and replacement reopening, unchanged-task evidence, settings-disabled/no-plan
  revision, explicit contract removal and receipt after failed ledger append.
  An initial assertion looked for a UI notification, while the existing sink
  reports a console diagnostic; the corrected passive warning observer checks
  that actual sink. scope-tweak-expanded-green.log retains the failed assertion;
  expanded-followup and sisyphus-expanded logs pass (22 requests each).
- First full run: 1046/1048, with two older preservation fixtures still expecting
  completed-title changes to be rejected. They now first prove unchanged-task
  evidence survives, then confirm a retitle and verify reopened state/history.
  The follow-up 99 targeted checks pass. Type/lint and context24/provider6 pass;
  full follow-up is pending at this checkpoint. Context rationale records the
  new schema and changed structural guidance, with unchanged semantic counts
  and all ceilings. No ticket005 checkbox is complete and this subset is not
  independently reviewed yet. Next: inspect full follow-up, review/commit the
  human subset, then external-edit proposals/approved audit scope and remaining
  native tweak lifecycle qualification.

- Full human-scope follow-up passes 1048/1048 across 76 files (81.9s).
  Final scope text makes absent goal contracts explicit as null for review;
  removed-task lookup rejects inherited object keys. Both final native
  22-request tweak modes plus type/lint pass after those two small changes.
  cf9c777 and preceding retained-scope repairs are pushed to origin. The human
  subset is ready for fixed-base independent review from cf9c777; external
  proposal handling and final native lifecycle matrix still remain for 005.

### Ticket 005 external proposal checkpoint (implementation incomplete)

- Both independent axes cleared the human-revision subset at 0af6cda, now
  pushed to origin. Spec independently exercised both native 22-request modes,
  74 targeted checks and full before/after terminal rendering at two sizes.
- External body/goal-contract/task-contract/title/new-required-task edits now
  derive pending review from raw versus retained scope. Automatic continuation
  and ordinary task/completion mutations are held until bound human revision.
  Five native variants pass in both modes; cancellation retains authority and
  confirmation records the exact revision after reopen. Additional automatic
  stop and ordinary-plan overwrite checks are included in the latest run.
- Native failures exposed two stale cache paths: a pool snapshot keyed by
  directory metadata, then prompt merge restoring its cached objective. Focused
  migrated goals now read their file directly; atomic mutations use that fresh
  record and accounting cannot overwrite pending raw edits. Legacy reads retain
  existing behavior. External task confirmation also exposed stale completion
  proof; reopening now compares against approved retained requirements.
- First full external run passed 1057/1058. Its sole failure was an overlay
  fixture injecting tasks only into private memory before persisting usage;
  the fixture now writes the same initial task state before loading. Its UI
  and full-evidence assertions remain. Targeted follow-up passes 113/113.
  Logs scope-external-* under Data/005 retain failed attempts, including a
  syntax-error attempt clearly distinct from the later passing overwrite test.
  Latest full/type/lint results are being inspected. Pending: inspection/UI
  labeling, retained audit input, pending reopen/compaction/races, fresh-read
  cost checks, independent review and remaining tweak lifecycle qualification.
  No additional ticket checkbox is complete.

- The first external full follow-up passed 1058/1058, plus type/lint. Expanded
  native cases now observe zero automatic requests after cold reopen and after
  pending-state reopen/compaction; the objective case rejects a same-revision
  file edit during confirmation. Existing inspection and dashboard views label
  scope review with the existing tweak action. The initial UI assertion assumed
  uppercase status text; the corrected check covers its actual lowercase footer
  and the action in both bounded views, with tasks enabled/disabled.
- Two large pending fixtures exposed a same-goal stale checkpoint suppressing
  approved review context. It now retains review guidance while work dispatch
  stays held. All 26 context fixtures and six provider payloads pass; original
  24 measurements/semantics are unchanged, and no ceilings changed. The cold
  reopen log named scope-external-cold-reopen-red.log is a passing preservation
  characterization, not a reproduced failure.
- Caller tracing reproduced explicit /goal-resume reverting to paused after
  the fresh-record persist change (scope-external-resume-red.log). Persistence
  now keeps explicit session controls while overlaying pending raw requirements;
  its native follow-up passes. The original overlay fixture is restored unchanged:
  its failure was a real persistence regression, not merely a fixture concern.
  The intermediate full run overlaps these edits and is not final qualification.
  A fresh final run follows the repaired tree. The first benchmark attempt used
  a nonexistent naf-after.json; the corrected campaign path is baseline-naf-after.json.

- Fresh B2/B7 measurements pass all 53 matched timing limits with zero guard
  violations. Separate focused migrated-context probes (20 samples each) cost
  one filesystem check after warmup, with local medians 0.017ms/0.186ms for
  1/200 public contracted tasks. The first sample costs 9/8 operations. These
  are synthetic local measurements, not native-host or model performance claims.
  Evidence: scope-external-benchmark.{log,json}. Historical gates/artifacts remain
  unchanged. Final qualification now runs against the frozen external subset;
  approved retained auditor input and the remaining human tweak lifecycle matrix
  still have to be implemented/verified before ticket 005 can close.

### Ticket 005 external subset independent findings

- Frozen 7324d98 passed 1059/1059 tests (76 files, 103.1s), type/lint,
  discovery/self-check, context26/provider6 and dry pack. Both independent axes
  then identified a pending-review early return hiding applicable guidance;
  Spec additionally reproduced buffered usage loss (121 tokens/8 seconds became
  zero), and public pause reporting success while the pending task-contract
  proposal remained active. These findings prevent integration despite the pass.
- Permanent red checks reproduce all three. Pending review now shares audit,
  Oracle, stall and compaction additions, with final hold guidance and its size
  reserved; a third pending fixture covers exhausted-budget wrap-up. Unchanged
  pending task trees bypass the ordinary contract-change guard for explicit
  lifecycle controls; public pause/resume is exercised while review is pending.
- Reconciliation now uses the common stale-buffer rejection path without
  needing a write lock, retains incurred usage against the fresh disk baseline,
  and preserves it through repeated reads. Four service variants cover free/
  held locks and independent 77-token disk accounting; all retain the local
  121 tokens/8 seconds, raw proposal, approved scope and rejection diagnostic.
  An intermediate locked-buffer overlay fix hid an accepted human receipt;
  scope-external-guidance-native.log retains that failure. Removing the stale
  buffer through the existing rejection behavior resolves both sides.
- Targeted service/presentation checks and native task-contract/goal plus
  objective/Sisyphus follow-ups pass; final follow-up type/lint/context/full and
  fixed-base re-review remain in progress. Auditor approved-input red is retained
  in scope-audit-input-red.log; its implementation is still next, not complete.

- Frozen d3f54af passes 1063/1063 full tests (101.9s), but re-review found two
  additional accounting/ownership edges: resolving the proposal before pending
  usage persisted again dropped 121/8, and reconciling a different pending goal
  discarded the old goal's locked buffer. The permanent red covers both.
  Rejection now checks goal identity, while delta reconciliation uses the known
  persisted usage baseline independently of pending-review status. Eight usage
  variants plus both cross-focus variants pass. The existing native 200-node/
  65-request concurrent-accounting/reopen check also passes with one work effect.
  A first targeted command named nonexistent goal-transactions.test.ts (Node
  silently omits it); its 51 passing cases cover service/presentation only.
  The actual goal-turn-transaction and accounting-runtime checks follow explicitly.

- Frozen 1bffa0c passes 1068/1068 full tests (102.2s); its actual transaction/
  accounting checks pass 17/17. Spec clears the repair. Standards then reproduced
  a missing baseline update in the single-task immediate write: after proposal
  rejection/reversion, task completion writes 121/8, then reconciliation charges
  it again as 242/16. The permanent red and one-line successful-write baseline
  repair follow the same existing bookkeeping as batch/apply/persist. All
  successful write callers were traced; targeted service/transaction/accounting
  follow-up passes. This repair receives its own review before integration.
- An isolated detached qualification worktree now exists at
  ~/Developer/scratch/pi-goal-x-qualification, sharing the installed dependency
  tree by symlink. Future frozen test runs there can proceed while the sole
  implementation writer works in the main checkout. It is not a package install
  or live Pi selection. Auditor input implementation/fixture work in the main
  checkout remains uncommitted and outside the external-scope repair review.

### Ticket 005 approved auditor input checkpoint

- Both independent axes clear e0d0cb4. The isolated frozen checkout passes
  1069/1069 tests across 76 files (103.3s), type and lint; external-scope commits
  are pushed to origin/feat/goal-reliability. A checkout command first named an
  invalid reference and changed nothing; the successful qualification explicitly
  used e0d0cb4925864623f2530cb0159b808d17170db9.
- New auditor-input red proves raw external objective/settings could replace
  or hide approved authority. The existing prompt builder now uses the retained
  objective/goal contract and includes complete retained task contracts/evidence,
  including removed tasks, as claims to verify. Legacy prompts remain unchanged;
  existing current task tree is labeled as planning/proposal material. The
  permanent escaped-delimiter/hidden-settings test and prior payload checks pass
  24/24. No new approval service or completion judgment is introduced.
- Both native scope-audit modes pass 12 requests and two summaries: actual UI
  chooses the enabled auditor, public tools create the artifact and task evidence,
  remove its planning node, disable task/contract presentation, compact/reopen,
  then invoke the actual isolated child auditor. The intercepted request retains
  full Unicode contract/evidence and no parent mutation tools or executor context.
  Root independently checks the artifact. The controlled rejection verifies the
  context/transport boundary, not semantic model quality (011/013 remain owners).
- Initial native attempts assumed an enabled auditor stored explicit false
  (it uses absent skipAuditor), then copied the executor's intentionally dead
  baseUrl into the child descriptor. The timeout with zero child requests exposed
  that fixture error; using the established provider descriptor shape passes.
  All attempts remain in scope-audit-native-*.log. Context28/provider7 pass with
  only the new retained-audit row added; prior 27 measurements remain unchanged.
  This auditor subset is still uncommitted/unreviewed. Large native compaction,
  latest type/lint and the remaining confirmed-tweak lifecycle matrix are next.

### Ticket 005 auditor and confirmed-tweak qualification

- Large 200-task manual/long/advice native compaction passes with complete
  retained auditor input: 30 executor requests, seven summaries, 200 completed
  tasks, four effects, original three successive compactions plus final stopped
  compaction. Type and lint pass (scope-audit-final-{type,lint}.log).
- New native active/paused/blocked/budget_limited tweak cases pass in both modes:
  public creation and stopping, refinement/cancel with no lifecycle events or
  checkpoints, bound human confirmation, and receipt/state after reopen.
  Paused/blocked clear pause metadata and emit one resume event/one checkpoint;
  that checkpoint explicitly pauses after observing the revised objective.
  Active manual-continuation remains active/manual. Budget stays exhausted.
- The initial native comparison exposed absent-vs-undefined fixture data, fixed
  by comparing serialized scope. A real exhausted /goal-resume defect then
  queued another checkpoint after an otherwise correct budget-limited tweak.
  The shared resume validator now reuses budgetReached, rejecting exhausted
  resumes with metadata/refresh guidance. Permanent policy red/green includes
  stopped status variants and raised/removed budget acceptance. This is the
  minimal exhausted-resume repair needed here; 008 still owns full attribution,
  budget refresh/restart, special focus paths, and wrap-up acceptance.
- All eight native lifecycle variants and 55 existing policy/drafting/budget
  checks pass. Failed attempts are preserved in tweak-lifecycle-*-first.log,
  tweak-lifecycle-budget_limited-characterization.log, and
  tweak-budget-policy-red.log. The auditor/lifecycle subset now proceeds to
  frozen full qualification and independent fixed-base review against e0d0cb4.
  Ticket 005 remains in progress until its evidence and review are complete.

- Frozen 970330a passes 1081/1081 full tests (76 files, 112.2s), discovery/
  self-check, type/lint, context28/provider7, NAF gate, production audit and
  dry pack; ranking harness passes 5/5. Standards independently passes26
  auditor/policy checks and reports no material finding. Spec review is pending
  a final native affordances follow-up before closing the ticket.
- Native question/questionnaire cancellation and selector resume/cancel/replace
  now run in both modes. The task-disabled structured-objective case revealed
  automatic bootstrap still created two hidden tasks: the old unit used an
  unstructured objective and missed it. The existing bootstrap and preview
  callers now honor tasksEnabled, including direct-create guidance. Existing
  tweak tasks remain preserved. Both native variants pass18requests; the
  strengthened unit and core-tool suites pass67checks. A named task-derive
  test file did not exist and Node silently omitted it; the67 count is explicitly
  the two existing drafting/core-tool suites, not a derivation suite.
- The initial affordances probe compared serialized and nonserialized optional
  fields; using structuredClone removes that fixture-only mismatch. Red hidden
  derived-task attempts and permanent unit red remain in draft-affordances-*
  and draft-disabled-derived-unit-red.log. Native assertions also check the
  actual confirmation text, not only stored task absence. This small follow-up
  receives fixed-base independent review and a new frozen full qualification.

### Ticket 005 completed; ticket 006 starts

- Both independent review axes clear dc4d94e. Standards independently passes67
  drafting/core checks; Spec passes those and both18-request native affordance
  modes, with no remaining concrete005 behavior/coverage gap. The independent
  active/automatic probe at970330a (16requests, one confirmed checkpoint, zero
  resume events) is retained as review-active-auto-970330a.{mjs,log} in Data005.
- Fresh isolated npm ci --ignore-scripts succeeds (368 packages, audit0), then
  frozen dc4d94e type/lint, full1083/1083 tests/76files/113.7s and discovery +952
  unit checks pass. Dry pack and production audit pass. Unchanged context28/
  provider7, NAF historical gate and ranking5 checks pass; fresh B2/B7 53-limit
  evidence remains applicable to unchanged runtime hot paths. Review-checks.json
  and docs/reviews/2026-09-08-ticket-005.md map exact outcomes and limitations.
- All005 criteria are checked on evidence; 001–005 are complete. No installed
  package, real-Qwen acceptance, latest-audit durability or live adoption is
  claimed. The approved goal remains active for006–014.
-006 is the next single-writer frontier (blocker002 already satisfied). Plan:
  characterize native reopen/reload/new/fork/tree focus and current project
  progress; reproduce/fix ownership defects at existing lifecycle boundaries;
  then exercise legacy reconciliation, fault/lock/ledger handling, recovery UI
  and child isolation. Acceptance remains the existing006 checklist. Initial
  trace finds session_tree calls loadState then queues continuation without an
  explicit navigation hold; the next step is a native reproduction before repair.

### Ticket 006 tree/fork ownership subset

- Ticket005 closure and reviewed runtime are pushed at c5dc4fc. The new native
  ownership worker creates the goal and contracted task through public tools,
  writes/independently reads verified.txt, completes the task, then resumes and
  navigates before queued work dispatch. On the baseline tree navigation wrote
  unsolicited.txt (tree-first.log); real host fork already detaches correctly.
- session_tree now applies the existing continuation hold after loadState and
  before scheduling. The field is renamed continuationHeld across its four
  modules to reflect both drafting and navigation, with no extra latch/service.
  Held active context distinguishes actual drafting from navigation and gives
  explicit focus/resume guidance. Project goal status/scope/progress is unchanged.
- Native tree/fork follow-ups pass: eight executor requests each, one approved
  work artifact, zero boundary work/provider requests, and one explicitly
  authorized post-boundary checkpoint. Tree also passes native compaction while
  held (two summaries); current disk evidence survives earlier-chat navigation.
- A new payload assertion initially assumed string content; actual SDK arrays
  are now read as such. Native compaction initially reported session too small;
  the fixture now uses the existing small keepRecentTokens=100 setup. Neither
  failure was a product regression. A prior unit expected active work steering
  after tree navigation; it now requires the same focused ID with held guidance
  at both branch switches, preserving explicit-null assertions.
- All67 drafting/unfocus/pool/session-safety checks, type/lint and unchanged
  context28/provider7 pass. Evidence stays under Data/pi-goal-x/reliability/006.
  This subset is uncommitted/unreviewed; remaining006 acceptance still includes
  reopen/reload/new/explicit-null/missing focus, legacy reconciliation, storage
  faults, recovery UI and delegated sessions. No006 checkbox is yet complete.

### Ticket 006 durable navigation finding and session matrix

- Frozen a7bfe4b passes1085/1085 full tests (76files,114.4s). Standards clears
  the slice and independently passes native tree/fork. Spec then reproduces
  a reopened navigated branch losing its ephemeral hold: two executor requests,
  one checkpoint and an unauthorized write. This blocks integration despite
  the suite pass. Exact independent script/log review-tree-reopen-a7bfe4b.* and
  root tree-reopen-permanent-red.log retain the red. The delayed native tree
  summarization probe was independently safe; no second finding was reported.
- Navigation now appends the same focused ID with reason=navigated in the
  existing branch-local focus entry, with no project ledger event. loadState
  restores the hold from that reason. Existing explicit arm and bound human
  confirmation share releaseContinuationHold, recording resumed focus before
  clearing the hold. Native tree now verifies compaction, reopen and reload
  cannot dispatch its armed write, then immediate reopen after explicit resume
  can execute exactly one checkpoint. The expanded tree/fork follow-ups pass.
- Native reopen/reload covers active, paused, blocked and budget_limited, plus
  paused reopen confirmation/decline. Nine cases pass: only eligible active or
  explicitly confirmed paused goals issue one request; no disposed runtime
  duplicate appears, and current project evidence/limited usage is retained.
- New-session default and explicit autoSelectSingleGoal cases pass. The opt-in
  case explicitly unfocuses then reopens and stays detached. Missing-focus
  coverage creates another goal through /goal-direct, moves only its goal file,
  and reopens with a still-valid sole alternative goal; it remains unfocused.
  The first fixture attempted a create_goal continuation from an active run
  and timed out before the following pause; the public direct command removes
  that fixture ambiguity. Both attempts remain in missing-focus-*.log.
- All75 record/drafting/unfocus/pool/session-safety checks and type/lint pass.
  The new matrix and durable repair proceed to frozen full checks and review.
  No006 criterion is marked complete; legacy reads, storage fault/recovery
  checks and child qualification remain next after this ownership subset.
  The overall development goal is still active.

- Both independent reviewers reproduced one remaining composition at31a2c4:
  navigating a paused goal then accepting the existing paused-resume dialog
  changed status to active but left its navigation hold set. Spec independently
  passed all14 other ownership cases; the original reopen leak is repaired.
  Permanent native tree-paused-confirm red reports zero requests instead of one.
  The dialog's successful resume now calls the same releaseContinuationHold
  path. Green: six executor requests total, one approved artifact, one newly
  authorized checkpoint, persisted resumed focus and unchanged task evidence.
  Type/lint pass. The frozen31 full suite is still running; this one-line caller
  fix and combined regression receive their own fixed-base re-review.

### Ticket 006 native recovery faults

- Both reviewers clear6b09645's paused navigation repair. Frozen31a2c4 full
  passes1097/1097; frozen6b09645 full passes1098/1098 (76files,121.6s).
  The reviewed ownership subset is pushed separately;006 remains incomplete.
- Native recovery initially passes diagnosis/cancel/confirmed backups against
  public-created, independently verified task progress. Priming a prior report
  then appending corruption reproduces a stale ledger report. Five boundary
  probes reproduce live-lock replacement deletion, disposed-session repair,
  backup-directory failure escaping the command, hidden lock-copy failure and
  falsely successful snapshot refresh after a denied write. recovery*-red.log
  retains all six failures under Data/pi-goal-x/reliability/006.
- Explicit diagnosis invalidates the ledger cache. Repair returns per-item
  failures, uses unique backup directories, rechecks lock identity/staleness,
  and requests a strict fresh snapshot write through the existing writer.
  Shutdown invalidates the existing operation revision; recovery confirmation
  checks it before repair and before any old-context notification.
- All six native cases now pass. The stale-session follow-up initially compared
  bytes before the normal shutdown persistence; it now compares the observed
  settled shutdown file, retaining exact preservation checks. Type/lint and
  targeted recovery/unfocus/drafting checks pass. No payload changed. The slice
  proceeds to independent fixed-base review and full qualification; legacy
  reads/refresh, broader path/storage faults and child qualification remain.

- Frozenb0e608a passes1104/1104 full checks (76files,124.1s). Both reviewers
  reproduce a directory-read failure being mistaken for an empty scan, so a
  strict write still replaced the snapshot and reported success. Spec also
  replaces a lock immediately after its backup and reproduces deletion of the
  new live owner. Independent pinned scripts/logs review-recovery-{scan,lock-copy}
  -b0e608a and permanent recovery-{scan,read,backup,copy}-*-red.log retain these
  and adjacent failure windows. b0e608a is not pushed while these are unresolved.
- The existing scanner/parser now support explicit strict reads; recovery
  bypasses listing/parse caches, propagates IO errors, and commits its pool
  cache only after a successful snapshot write. Ordinary reads retain their
  existing best-effort behavior. Repair compares the reported lock bytes,
  backup bytes, current bytes and file identity before removal. Native denied
  directory/file reads and replacements before/after the copy now preserve the
  prior snapshot/lock and emit actionable diagnostics.
- A public-created goal/session converted to the legacy file/full-state format
  reopens paused, migrates focus and retains current completed evidence over
  historical pending chat. Editing only its Goal Prompt body reproduces
  /goal-refresh falsely reporting no change because it reused the pool snapshot.
  Explicit refresh now scans current files with the same strict reader, reports
  updated records, reconciles the focused view, and leaves user bytes unchanged.
  Native legacy-refresh passes through another actual reopen. Scope discrepancy
  rules for migrated records remain005's approved behavior, not a scope waiver.
- Type/lint, targeted refresh/recovery/pool/drafting/unfocus checks and the
  combined native recovery/legacy cases pass. The repaired slice proceeds to
  fixed-base re-review and frozen full qualification.006 remains partial.

### Ticket 006 cache and path validation

- Both reviews clearc65b699, frozen full1109/1109 passes (76files,126.0s),
  and the recovery/legacy subset is pushed to feat/goal-reliability.
- Eight native S2 record cases preserve task evidence and outside files:
  truncated goal, symlinked goal, unsafe active/archive metadata, malformed
  snapshot entry during shutdown, and cold snapshots with invalid lifecycle,
  task, retained-scope or path data. Snapshot entries previously bypassed
  validation and a null entry threw during shutdown's cache update. Both sync
  and async readers now share validation against the existing record normalizer
  and safe-path checks, rejecting corrupt caches in favor of goal files.
  Legacy unknown top-level fields remain supported (the existing snapshot-marker
  test caught an initial overly strict comparison; its assertion is unchanged).
- Direct authoritative reads previously adopted unsafe embedded path metadata,
  then lost focus on the next reconciliation. The shared service keeps the
  actual active path and validates the archive path. An initial use of the
  general sanitizer deleted optional own keys and caused transaction comparisons
  to reject normal writes; explicit canonical path fields preserve that shape.
  All failed attempts remain in record-*.log. The path fixture first omitted the
  public work revision/upsert mode, then exposed the actual focus-loss defect;
  current assertions require a non-null current public result before inspecting it.
- Eight native cases,59 storage/service/transaction checks and type/lint pass.
  Fresh B1/B2/B5b/B7 run matches75 historical NAF timing limits with zero
  regressions, before the final lexical snapshot-path guard; records-benchmark
  .json/.log retain that measurement. No context text changed. Independent
  fixed-base review and frozen full qualification follow.
- Next storage seam is reproduced but not yet repaired: native resumed public
  task writes under denied directory access throw out of flushTurn hooks;
  lock contention silently retains a pending transaction without a diagnostic.
  Existing unit semantics intentionally retry a contended buffer after release,
  so preserve that behavior while reporting pending persistence. Ledger-only
  failure and stale work-revision native cases already characterize correctly.
  Earlier attempts ran while paused and correctly hit stop controls; the active
  reproductions are storage-*-active.log, with the pending fixture fragment
  preserved in Data006/storage-fixture-fragment.json. Broader006 checks, child
  qualification and all007–014 work remain; no006 checkbox is yet complete.

### Ticket 006 authoritative write failures and delegated sessions

- Both independent reviews clearba9a4b8's eight record cases; frozen full passes
 1117/1117 (76files,131.8s). Correction to the prior note: its final lint process
  had not been inspected before writing the pass claim. records-final-lint.log
  actually reports an unreachable return in the async snapshot reader. That
  redundant return is removed here; current type/lint both pass. ba9a4b8 was not
  pushed while final checks were unresolved.
- Native resumed public task writes reproduce denied write errors escaping
  turn_end/turn_start and then agent_end persistence. flushTurn now rejects
  unsaved buffered work through its existing rejection/owed-usage path and
  reports actionable storage diagnostics. Best-effort persistence reports IO
  failure without throwing out of host lifecycle hooks. Active files and
  success-ledger bytes remain exactly unchanged while access is denied; the
  task remains pending after access restoration, pause, get_goal and reopen.
- A fresh live lock preserves the pending transaction as upstream requires,
  now with one diagnostic per repeated flush failure. Disk/ledger stay unchanged
  while locked; the existing next-boundary retry commits after release. Native
  ledger-only EISDIR failure preserves the saved task result with a warning,
  while stale work revision returns current revision guidance without rollback.
- A caller audit adds a denied-resume reproduction: setGoal used to commit
  memory before saving, allowing a false resume notification/ledger event.
  Existing-goal state changes now use GoalService.apply and return success to
  the command, paused-reopen confirmation and debug-widget callers. Failed
  command/dialog resumes produce neither a success event nor a checkpoint;
  actual project status stays paused. Prior reds and intermediate hook errors
  remain in storage-*.log; no test expectation is weakened for write failure.
- Ten native storage/child cases pass. Four actual host child variants
  (new/fork/reopen/nested) load only child context filtering, keep the dedicated
  assignment, expose no parent goal controls, append no parent control state,
  issue no inherited continuation and preserve settled parent bytes/evidence.
  Existing native 200-task manual compaction with actual Oracle/auditor child
  transport also passes (30executor,7summaries,4effects) and checks their dedicated
  prompts/tool profiles, no executor projection, and Oracle read-only tools.
- Current120 targeted service/transaction/core/draft/unfocus/pool checks and
  type/lint pass. The full006 acceptance review and frozen final qualification
  follow; criteria remain unchecked until that evidence and review are complete.

### Ticket 006 full-review repairs

- Frozen d013fcd passes1127/1127 full checks (76files,136.1s), type/lint,
  discovery/selfcheck952, context28/provider7, historicalNAF/ranking5,
  dry-pack and production audit (zero vulnerabilities). Fresh B1/B2/B5b/B7
  matches75 historical timing limits with zero regressions. The full reviews
  nevertheless reproduce previously uncovered public failures; d013 is not
  pushed or considered accepted.
- A paused-reopen confirmation could overwrite a same-revision external prompt
  proposal or resume after tree/session replacement. Existing setGoal now binds
  its mutation to the current work fingerprint; paused confirmation binds both
  work and focus generation across the await. The reopen selector also checks
  its generation. Raw proposal bytes remain intact and obsolete dialogs queue
  no checkpoint. Permanent native reds and reviewer scripts remain in Data006.
- The ownership worker now binds through AgentSessionRuntime.setRebindSession,
  after the host installs its current session. Its earlier factory-time binding
  made nested newSession target the outgoing host. The corrected native binding
  still fails on frozen d013 (stale-context error) and passes with the guard.
  No hook is invoked manually; all prior ownership cases remain exercised.
- Denied /goal-pause and /goal-clear writes now return actionable outcomes
  through the existing mutation service. Pause fields commit with the status;
  failed archive retains focus. Native clear confirmation, cancellation, tree
  staleness and write failure check goal/ledger/focus preservation and saved
  artifact evidence. Clear cancellation is a byte-for-byte durable no-op.
- Lock contention now carries EWOULDBLOCK; other acquisition errors reject the
  unsaved buffer with the real access error and retained owed usage. A review
  follow-up catches stale flush diagnostics after a successful retry; successful
  immediate mutation clears that prior error. The added retry-notification
  assertion fails before repair and passes afterward, without weakening the
  original state-preservation assertions.
- A cache with a valid but incorrect complete status could hide branch focus.
  Missing cached explicit focus triggers the existing authoritative scan before
  restoration. Read-only recovery also bypasses stale parse cache and diagnoses
  unreadable goal files instead of reporting a clean bill of health.
- All55 native ownership/storage/recovery cases and151 targeted service/core/
  transaction/draft/unfocus/snapshot/extension checks pass before the final
  retry-notification addition; its17 affected native cases pass afterward.
  Type/lint pass. Independent fixed repair review and frozen full qualification
  follow. 006 remains in progress; all007–014 work and package/model gates remain.

### Ticket 006 lifecycle controls and incomplete clear

- Frozen7817281 passes1138/1138 full checks (76files,142.2s), selfcheck952,
  dry pack and production audit; fresh B1/B2/B5b/B7 again matches75 unchanged
  timing limits with zero regressions. Both reviewers independently clear the
  preceding repairs but reproduce three adjacent public compositions.
- Work fingerprints deliberately exclude lifecycle controls. A same-revision
  external blocked state could therefore be overwritten by paused confirmation.
  Shared setGoal now validates the complete normalized prior record, excluding
  only usage/updatedAt, before replacing it. The open dialog also rejects a
  replaced in-memory record. Native stale-control red/green verifies exact
  external bytes and zero unauthorized requests; existing work fingerprints
  remain independent of accounting.
- A confirmed clear with an earlier buffer behind a live lock reported success
  before any archive was saved. archiveCurrentGoal now requires the existing
  buffer to flush successfully before attempting immediate archival. A failed
  clear preserves focus and appends no archive request for a later silent retry.
- With an existing writable archive directory and denied active-file deletion,
  archiveGoalFile swallowed unlink failure. It now reports the failure and the
  retained partial copy's path, leaving the active record authoritative and
  focus intact. The public command can be explicitly retried after access is
  restored, updating the same copy and completing removal. This fixes public
  clear failure handling;011 still owns completed-goal restart recovery.
- All three new native reproductions fail before repair and pass afterward.
  Existing archive/file and mutation regressions plus affected native cases,
  type/lint and fixed follow-up review qualify this slice before006 closure.

### Ticket 006 closure and ticket 007 frontier

- Final runtime d5ad5cbdb8bff83b39df860ea211aa3b94308f08 passes1141/1141
  full tests (76files,143.4s), type/lint, discovery/selfcheck952, context28,
  provider7, historicalNAF, ranking5 and dry pack. Fresh B1/B2/B5b/B7 checks75
  matched timing limits with zero regressions. Dependencies are unchanged from
  the isolated005 npm ci --ignore-scripts; latest production audit at781 is0.
- Both independent axes are clear. Spec independently passes all58 native
  ownership/storage/record/recovery cases, Standards six final compositions.
  Standards' architecture documentation request is implemented and reviewed:
  partial archive copies are diagnosed, the active file stays authoritative,
  and an unchanged-record retry updates the same copy. Intervening record
  updates may choose another timestamped archive path; retained copies grant
  no execution authority. No material review finding remains for006.
- docs/reviews/2026-09-08-ticket-006.md maps every criterion to actual-host
  evidence; Data006/review-checks.json records commands and exact versions.
  All006 criteria are complete. G6/G13 broader completion/package obligations
  remain with011/012; no live installation or Qwen acceptance is claimed.
- Frontier007 starts with a native stop/steering matrix: public pause, Esc,
  agent pause, unfocus, focus switch and clear against queued checkpoints,
  active responses, task dialogs and async audit/Oracle callbacks. Trace the
  existing runtime generation and dispatch guards, reproduce failures, then
  repair through those shared boundaries. Preserve ordinary explicit user
  work and already-dispatched effects; do not substitute hasPendingMessages
  for actual host queue behavior. All008–014 gates remain unchanged.

### Ticket 007 first native dispatch reproductions

- 006 closure is committed and pushed as7680b30; final runtime is d5ad5cb.
  The new standalone native stop worker uses the actual loader/runtime, public
  goal/task creation, real command/terminal handling and controlled provider
  responses. It checks forbidden file effects and a fresh ordinary user write
  after the stop. No product007 changes are made yet.
- Initial fixture attempts returned while task confirmation had ended a run
  but a checkpoint still had pending scripted work. The settling condition now
  waits for both the scripted responses and native host idle, matching the
  established ownership seam. All first-attempt logs remain in Data007.
- Corrected response-boundary probes reproduce unauthorized file writes after
  public /goal-pause, focus switch and confirmed /goal-clear. Native Esc/abort,
  unfocus and agent pause already prevent the effect and preserve later ordinary
  user work. Scheduled-checkpoint pause/Esc/unfocus/switch/clear pass. A bare
  idle SDK abort emits no user-stop extension event and does not cancel an
  extension timer; the actual queued-user-Escape path does pass. Retain that
  host characterization separately from active abort/terminal behavior.
- Current diagnosis: tool_call rejects stale checkpoint identities and the
  current turn's explicit stop marker. User pause, focus and clear do not all
  mark/abort their originating active request; per-response turn advancement
  also clears a turn stop. A repair must bind the whole old run/generation,
  invalidate asynchronous dialogs/results, cancel supported work, and reset
  only on fresh user/authorized checkpoint intent. Do not accidentally pause
  newly focused goal B when the host reports old goal A's abort.
- Next: finish all relevant caller tracing, add active-secondary and repeated-
  response checks, repair the existing runtime/dispatch boundary, then expand
  the native matrix to already-dispatched effects, task/audit/Oracle dialogs
  and actual steering/custom/next-turn queues. tests/goal-stop-worker.mjs is a
  work-in-progress seam; register cases in the existing integration suite once
  their required behavior is implemented. 007 criteria remain unchecked.

### Ticket 007 initial stop boundary repair

- Twenty new registered native cases pass: six response controls plus switching
  to an active successor, the same seven controls against a running bash tool,
  five scheduled-checkpoint controls and an agent pause after an earlier work
  effect. The first bash effect remains; its later write is cancelled. Public
  ordinary-user writes after stops remain available. Three dispatched-work
  probes also fail against frozen d5; all red/green logs remain in Data007.
- Shared core cancellation invalidates focused operations, marks the current
  turn stopped, cancels continuation/audit work and asks Pi to abort a busy run.
  Pause, focus switch and confirmed clear use it; unfocus retains its existing
  cancellation path. A failed pause holds automatic work while reporting the
  unsaved stop. Clear cancellation still never enters the cancellation path.
- Active-successor coverage caught the old run being rebound to newly focused
  B on each response, then pausing B when A's abort settled. Running identity
  now binds at fresh user/checkpoint intent and remains through the response
  chain. A user's already-queued successor is revalidated after the old run
  settles. Automatic abort handlers check their originating goal; unfocus no
  longer erases that attribution before settlement.
- The active-B fixture initially consumed B's scripted output in the old
  aborted run. It now observes actual native checkpoint starts and offers B's
  proof only to B's own checkpoint; the corrected case fails before the run
  identity repair and passes after it. Both intermediate traces are retained.
- 41 native checks (20 new plus21 affected006 regressions),110 targeted checks,
  type and lint pass. Fixed-base review and full qualification follow. Remaining
  007 acceptance includes host-held checkpoint generations/duplicate delivery,
  fresh steering and custom/next-turn queues, dialog/audit/Oracle races, durable
  cancellation and post-stop allowlist coverage. No007 criterion is closed yet.

### Ticket 007 review follow-up: resumed intent and ordinary work

- Frozen 80e9796 passes all1161 tests in76 files (150.8s), context28 and
  provider7. Independent Standards review found same-goal pause/resume before
  an old abort settles is paused again; Spec review found clearing a paused
  goal aborts an unrelated running user tool. Both native reds are retained in
  Data007, including Spec's passing 7680b30 ordinary-work baseline.
- Bind the originating run to the existing focus-generation token. Dispatch
  and abort/continuation handlers reject superseded runs; an explicitly queued
  same-goal resume survives settlement just like a selected successor goal.
  Shared cancellation preserves ordinary paused-goal work from both host
  abort and the turn-stop guard. Unfocus uses that same cancellation boundary.
- Register six more native cases: response/dispatched same-goal resume and
  pause/unfocus/switch/clear during an unrelated ordinary tool. All26 native
  stop cases pass; the ordinary tool's later effect and subsequent dispatch
  both complete. The newly registered clear probe also fails at80e9796.
- 74 targeted checks, type and lint pass;30 affected checks pass after the
  final continuation guard/message adjustment. An attempted npm run typecheck
  failed because the repository script is named check; npm run check passed.
  Logs: Data007/{generation-*,ordinary-clear-registered-red.log}. 007 remains
  in progress; queue ownership, async result/dialog races and qualification
  are still required. No new acceptance checkbox has been closed.

### Ticket 007 host-held checkpoint and steering receipts

- Both independent reviews confirm fd11573 resolves the material run-generation
  and ordinary-work findings. Spec identified a test timing gap: Pi ran the two
  ordinary tools in one batch concurrently, so the second file already existed
  at stop. The worker now puts that write in the next response and asserts its
  absence at stop. All four corrected ordinary cases pass. Earlier logs/claims
  remain traceable; the original ordinary-clear repro also independently passes.
- Public replay of an issued checkpoint after pause/resume reproduced an
  unauthorized file write. Runtime UUID plus sequence now validates and consumes
  only the currently issued checkpoint. Stops invalidate its queued receipt;
  reload cannot reuse another runtime's authority. The normal marker and
  automatic projection remain bounded. A rejected old delivery preserves an
  explicitly scheduled successor until native settlement.
- Native nextTurn attachments initially displaced fresh user authority. Treat
  a marker attached before that user's first context as context only. A later
  queued follow-up remains a separate trigger and must validate its receipt;
  the first broader whole-run ignore rule failed this case and was narrowed.
  Both failed attempts and corrected native results are retained in Data007.
- Actual autonomous checkpoints raced with ordinary steer/followUp messages and
  six stop controls (pause, Esc, abort, unfocus, switch, clear): all12 pass. Pi
  drains the user queue into a fresh run after cancellation. The first fixture
  deliberately returned toolUse despite a signalled abort, causing queued tools
  to inherit that aborted run; steering cases now implement the provider's
  aborted-event contract. Non-steering dispatch tests still deliberately return
  tool calls after stops to verify the extension's dispatch guard independently.
- 47 native stop/queue cases plus14 startup regressions pass;59 targeted runtime,
  context and ownership checks pass; type/lint and context28/provider7 pass.
  Exact logs: Data007/{queues-steering-native,queues-check,queues-lint,
  queues-context,queues-provider,receipt-targeted}. Native red traces are
  replay-pause-resume-red, next-turn-pause-red, host-followup-pause-red and
  steering-pause-{first,trace}; intermediate green logs are retained too.
- 007 remains open for task-dialog and async audit/Oracle races, further controls
  and full qualification. No ticket acceptance checkbox is closed by this slice.

### Ticket 007 immediate abort and async-review boundary

- Frozen2fec3f7 passes1188/1188 tests in76 files (165.2s). Standards review is
  clear. Spec independently passes47 native cases but finds standalone pending
  steer/followUp still permits automatic dispatch before the user request.
  The prior tests also sent a stop command. New standalone native reds reproduce
  the ordering; tool_call now yields goal work to queued ordinary user input.
  No lifecycle state is changed merely because input is pending.
- Native task confirmation committed after raw host abort because pause arrived
  only at end-of-turn. Listen to the native run AbortSignal and invalidate/pause
  its still-current origin immediately. The same shared repair protects async
  completion/Oracle returns. A superseded abort still cannot pause new intent.
- Oracle's supported signal parameter was never wired at the caller. It now
  receives ctx.signal; native HTTP cancellation proves the connection closes
  without accepting late advice. Completion keeps its separate controller.
  Fourteen pause/abort/unfocus/switch/clear/resume-successor child races pass.
  Three additional Esc cases preserve modal semantics: task cancellation leaves
  the goal active; audit Escape cancels only the child and honors Continue;
  Oracle Escape stops the goal. All use native Pi/public tools and real child
  HTTP, no direct invocation of extension lifecycle hooks.
- A transport fixture first asserted before the server's close event; corrected
  it to await that observable boundary. Audit then passed without product change;
  Oracle still failed before the signal wiring. Retain both first attempts and
  transport-close evidence. Corrected task-storage assertions resolve public
  relative active paths against the synthetic project and read the actual file
  (or clear's archived copy), rather than silently skipping absent relative paths.
- All73 native cases pass (async-native.log), plus122 targeted checks
  (async-targeted-corrected.log). One old golden fixture claimed a normal work
  turn while hardcoding hasPendingMessages:true: the new guard correctly blocked
  it. The two provider-turn fixtures now explicitly have no queued user input
  and assert the work dispatch is allowed; continuation/error assertions remain.
  Original121/122 failure retained at async-targeted.log. Type/lint pass.
- Evidence remains Data007: dialog-abort-first, steering-only-red,
  oracle-pause-transport-close, *-signal-green, *-esc-special and async-* logs.
  Remaining007 work: agent-pause compositions/host serialization, additional
  cross-session stale-control coverage if required, post-stop allowlist and
  dashboard Esc preservation, final fixed review/qualification and criterion
  mapping. Tickets008–014 and final packaged/Qwen/adoption gates remain open.

### Ticket 007 preservation qualification checkpoint

- Both reviews clear0751fdc; Spec independently passes all73 native cases.
  Frozen0751fdc passes1214/1214 tests,76 files,176.0s. Discovery self-check
  passes952 tests/71 files; historical NAF gate, ranking5 and dry pack pass.
  Fresh B2/B7 pass53 timing limits with0 regressions and no agent/network/spawn
  violations. Exact logs/artifact: Data007/async-{full,selfcheck,naf,ranking,
  dry-pack.json,benchmark.log,benchmark.json}. Product commit0751fdc was pushed
  to origin/feat/goal-reliability; no installed selection changed.
- Native preservation additions pass: stale/replayed checkpoints retain get_goal
  while rejecting write, including reload/reopen with the old runtime receipt;
  dashboard Escape consumes collapse and permits work, while the next Escape
  stops it. Twelve selected preservation cases pass; an additional checkpoint
  agent-pause case passes, including reason/suggestion and fresh ordinary work.
- Independent Standards coverage audit verifies Pi's sequential tool contract.
  Three maintained batches now observe pending-entered → pending-released →
  agent-pause-dispatch across task dialog, audit and Oracle. Nonterminal earlier
  results (cancel/disapprove/actionable advice) let the pause actually dispatch;
  the trailing write is absent. Same-host agent pause cannot precede an earlier
  awaited result. Concurrent user controls remain the real cancellation races;
  this in-session ticket does not introduce distributed execution coordination.
- The first checkpoint-pause assertion incorrectly equated one checkpoint with
  one executor response: Pi may consume a blocked trailing-tool result in the
  same run. It now checks one actual checkpoint, one pause dispatch, no new
  requests after settlement, and no forbidden work effect. Original failure is
  retained at checkpoint-agent-native.log; corrected proof is
  checkpoint-agent-corrected-native.log. Other logs: preservation-native.log,
  allowlist-dashboard-native.log, replay-{reload,reopen}-first.log.
- Current next step: freeze the completed85-case native matrix, final full
  qualification and cumulative007 independent review against7680b30, then
  close007 with exact criterion mapping. 008 is the next eligible ticket.

### Ticket 007 cumulative review follow-up

- Frozen0601fa9 passes1226/1226 full tests (76 files,180.2s), type/lint,
  context28/provider7, dry pack and production audit (zero findings). These
  results are inspected in Data007/final-*; acceptance remained open.
- Final cumulative review found two material paths: direct replacement left
  the previous goal's running process alive; agent pause followed by immediate
  public resume allowed a later old-run response to write before any new
  checkpoint. Independent probes and maintained-worker reds are retained as
  review-standards-direct-switch-0601fa9, review-agent-pause-resume-0601fa9,
  replacement-registered-red and agent-resume-registered-red.
- Successful replaceGoal now calls the existing ownership-aware cancellation
  boundary. The focused-record setter invalidates the generation when an active
  goal becomes stopped, covering agent lifecycle transitions across responses.
  The first attempt attached invalidation to every turn stop and broke normal
  startup after task confirmation; it was removed. Failed logs include
  stop-hook-startup-trace, agent-resume-generation-green and
  replacement-cancel-green (their names do not imply success).
- New native proof resumes from the real turn_end callback after agent pause;
  only a newly issued checkpoint writes the successor proof. Replacement races
  response, dispatched bash, task dialog, auditor and Oracle, and preserves an
  unrelated ordinary request begun while paused. Ordered direct replacement
  uses the same path. All assertions observe public tools, commands and effects.
- lifecycle-native.log passes106/107; the ordered fixture was rejected because
  its objective omitted required ordered steps. replacement-ordered-trace.log
  exposes that notice; the corrected valid objective passes in
  replacement-ordered-green.log. This also exposes the original goal repeatedly
  continuing text-only responses after the rejected command; ticket009 owns
  the no-progress/nudge behavior and must investigate this retained trace.
- lifecycle-targeted.log passes109; lifecycle-check/lifecycle-lint pass.
  agent-resume-lifecycle-green, replacement-cancel-lifecycle-green and
  replacement-ordinary-first independently pass. The registered matrix now has
  93 stop cases plus14 startup checks. No criterion is closed yet; next are
  independent follow-up review and frozen qualification, then008.

### Ticket 007 accepted; ticket 008 opened

- Final runtime55188dbdfd8619cac309adefdd4a1044843f80d5 passes1234/1234
  tests (76files,184.8s), including all93 native stop cases and14 startup
  cases. Type/lint, discovery952, context28/provider7, historical NAF gate,
  ranking5, dry pack65files and fresh B2/B7 (53 unchanged timing limits,
  zero regressions/agent/network/spawn violations) pass. Production audit at
  0601fa9 reports zero findings; dependencies are unchanged. Exact evidence:
  Data007/review-checks.json, lifecycle-full.log and closure-*.
- Both cumulative reviews against7680b30 are clear. Standards independently
  verifies12 compositions, including tool-driven create replacement; Spec
  passes93 native cases and its original immediate-resume reproduction. Its
  old count assumption was corrected without changing the forbidden-write
  assertion; the first count failure remains in Data007. Final probe artifacts
  and criterion mapping are in docs/reviews/2026-09-08-ticket-007.md.
- All007 criteria are accepted. Remaining G5 provider coordination belongs to
  010. 008 is the current frontier;009/010 also have their listed prerequisite
  satisfied. One implementation writer continues in ticket order.
- 008 diagnosis: a real checkpoint pauses and consumes a final blocked-tool
  result in a second response;220 executor tokens are reported, but public
  goal usage does not increase at all. Repro/log Data008/accounting-baseline.mjs
  and terminal-pause-red-55188db.log. The current status check discards final
  response usage once paused; focus attribution and repeated-event paths also
  need tracing. Plan: bind each executor response to its origin, repair once-only
  accounting and controlled elapsed time through the existing service, then
  verify exact/overshoot budgets, compaction/reopen and metadata/refresh resume.
- Tickets008–014, exact package/compatibility, six real-Qwen runs and concrete
  adoption/rollback preparation remain open. No live selection is changed.

### Ticket 008 first accounting repairs (still open)

- Reproduced and registered the native final-pause loss: the five executor
  responses report550 input/output tokens; storage had220. The stopped-status
  and cleared-clock guard was dropping the owning run's remaining responses.
  accountProgress now records final tokens through the existing mutation service
  without restarting stopped elapsed time. A rejected save reports the exact
  unpaid token count; durable retry/attribution across all stop/focus paths still
  needs the remaining008 work and is not claimed complete by this slice.
- Pi0.85.1 emits turn_end before agent_end for normal, error, aborted and fatal
  failure responses (agent-loop.js and agent.js). Removed duplicate aborted
  charging at agent_end. The turn_end handler uses a WeakSet of response objects
  to reject repeated delivery. A helper regression was red at10000 versus5000
  and is now green; native pause observes550 exactly and verifies fresh ordinary
  work/get_goal do not bill the paused goal.
- Controlled clock reproduction lost both600ms charges; accounting now retains
  fractional active milliseconds through frequent charges and new response
  starts on the same goal. Existing excluded gaps and whole-second storage
  remain. Clear/switch resets the fractional remainder. The fixture uses a
  controlled Date.now, with no wall-clock sleeping to establish elapsed usage.
- Data008 evidence: terminal-pause-registered-red.log, repeated-event-red.log,
  fractional-time-red.log retain failures. terminal-pause-first-green.log passes;
  first-native.log passes15 native terminal/abort/agent/serial/budget regressions;
  first-targeted.log passes57. fractional-and-repeat-green.log passes17. Initial
  type/lint pass at first-check/first-lint; final fractional type/lint results
  are recorded separately. All008 acceptance checkboxes remain open.
- Next: charge old goal A after focus switch/replacement/unfocus/clear, account
  aborted/final work once through retry and compaction, preserve usage across
  reopen and supported metadata changes, exact/overshoot budgets and one wrap-up.
  Full qualification and independent008 review remain pending. 007 closure
  35a1093 is pushed; no live package changes.
