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
