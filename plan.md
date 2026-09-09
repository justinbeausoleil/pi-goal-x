# Plan: repair pi-goal-x goal continuity

Status: approved by the maintainer, 2026-09-08; implementation in progress.
Read [intent](intent.md), [spec](spec.md), and the [ticket index](docs/tickets/README.md).
The [review and lifecycle matrix](docs/reviews/2026-09-08-ticket-red-team.md)
records gaps, resolutions, source anchors, and preservation coverage.

## Test seams and delivery

- **S1 — actual Pi session:** load the extension with Pi's real loader, invoke
  public commands/tools, exercise actual lifecycle events, and inspect outbound
  provider requests and tool results. A deterministic provider may control
  executor output and lossy summaries. Never manually fire a missing startup
  event or read private core state to make the test pass.
- **S2 — persistence through public interfaces:** create/mutate through S1,
  reopen/fork/navigate real sessions, then query public tools. Fault injection
  at the filesystem boundary is allowed to test write/lock/archive errors;
  observe diagnostics and externally visible records. Copied legacy fixtures
  test migration, never the public 200-node capacity claim.
- **S3 — local Qwen through Pi:** compare upstream and the packed candidate
  with real work tools and independently checked artifacts. The first bounded
  diagnostic reuses a recorded summary; deferred broad acceptance uses real
  model-generated summaries.

The maintainer approved this plan, S1–S3, D1–D6, all 14 tickets, and ADRs
0002–0004 on 2026-09-08. Authorization covers implementation, dependency
alignment, local/isolated tests, the fixed Qwen matrix, documentation, commits,
and pushes to the fork implementation branch. Live adoption, publication,
main changes, and messages to others remain outside this goal.

The maintainer's 2026-09-08 cost review supersedes automatic execution of the
remaining Qwen matrix. Stop matrix03, preserve all outcomes, and revise 013–014
around the bounded comparison below. More broad model runs need a separate
decision after its report; do not automatically restart a matrix after repairs.

The ticket index is the single dependency graph. Start with the first unfinished eligible ticket, initially 001.
003 and 006 become independent after 002; use one writer unless parallel work
is requested. Each ticket states its demo, contract, non-goals, and proof.
Preservation tickets first characterize existing behavior; fix regressions
caused by this fork rather than rebuilding working phases.

## D1 — start and per-response context contract

The custom-message kickoff, normal prompt, automatic checkpoint, resumed
agent, and post-compaction response must share focused-goal reconciliation,
execution identity, and stale-trigger checks. Before-agent-start may retain
static instructions or actual user-start handling; it cannot own the only
copy of dynamic state or the only execution guard.

Build one ephemeral projection after reconciliation at each executor context
event. Include goal ID, work revision, lifecycle/allowed action, objective
reference, current task/ancestors, counts, scope/contract references, budget
state, and applicable pause/block/audit/Oracle/stall steering. Order these
before optional recent activity. Cap the aggregate injected text at 10,000
characters, including headers, fallback warnings, and checkpoint markers.
For oversized fields, preserve identifiers and retrieval instructions, mark
excerpts explicitly, and omit low-priority excerpts; never truncate away the
lifecycle action or a needed retrieval locator.

Compose with existing checkpoint/audit filtering; preserve tool-result pairs,
ordinary user messages, and unrelated extension context. Leave no stale dynamic
goal block in the system prompt. Do not persist projections or add them to
the separate compaction summarizer request. Auditor, Oracle, and delegated
sessions retain their own explicit context and tool restrictions.

S1 observes startup, a second checkpoint, mutation within one run, and three
successive compactions in each of manual/threshold/overflow scenarios.
The current task must sit beyond the compact task preview. A scripted summary
deliberately omits it. Also compact paused, blocked, and budget-limited states;
no active-goal steering may leak into them. Count provider requests and work
effects to expose duplicate continuations.

## D2 — task mutation and detail contract

Retain the five normal goal tools. Extend set_goal_tasks with mode=upsert or
mode=replace (omitted mode retains the legacy replacement interpretation).
Upsert accepts at most 50 entries per call; the resulting plan and full
replacement accept at most 200 total nodes. A 201st node fails atomically.
Build 180 through batches, preserve completed evidence, then append 20.

Upsert creates unknown IDs (title required) and edits only supplied fields on
known IDs. Omitted fields retain their values; new entries default to pending
and roots. parent_id=null explicitly moves a node to the root.
Existing siblings retain order; new/moved entries append in input order.
Full replacement specifies the complete ordering/tree; omitted IDs are removed
only after the structural confirmation. Stable IDs retain status, evidence,
and timestamps when their trimmed title and contract are unchanged. Any title
or contract change to a completed task, through any structural path, must
reopen that task and clear its current completion evidence/timestamp; historical
evidence remains history. Ticket 003 rejects those edits until 005 supplies
the reviewed scope-edit path. Do not accept progress fields in structural input; progress
continues through update_goal_task and its existing ordered atomic batch.
Contract clearing or weakening also needs D3 scope approval; an ordinary
structural confirmation cannot authorize it.

Return work_revision in get_goal, projections, and successful mutation results.
It is an opaque content fingerprint of goal ID, objective/goal contract,
retained scope, task structure/status/evidence, and current task. Exclude usage,
wall-clock timestamps, ledger appends, and storage revision. Existing-plan
structural writes and task-progress writes require expected_work_revision;
missing/stale values return a non-mutating error with current revision and
get_goal guidance. Initial creation of an empty plan can omit it. This deliberate
tool-contract change must be reflected in schemas, prompts, and fork release
notes. Keep the existing numeric storage revision and per-goal lock for disk
compare-and-swap; validate the work fingerprint against the reconciled clone
inside that mutation path. Accounting between request and tool execution must
not make every otherwise-current task update stale.

Validate the entire resulting tree before any commit: IDs/titles, references,
cycles, configured depth, lightweight placement, capacity, and lifecycle/focus.
A stale batch or one invalid member commits no member. Preserve currentTaskId
only while it names a pending node. Preserve existing ordered-goal and normal
parent gates; lightweight children do not gate their parent, but their retained
contracts still apply at global completion.

Reuse get_goal section paging and its content-bound cursor, not a second query
API. Each page exposes goal ID, section/task, content revision, exact content,
and next cursor/end. Concatenating content must reconstruct every byte-equivalent
string (including Unicode) without overlap/gaps. Changed selected content,
wrong goal/section/task, or malformed cursor returns a stale/invalid error and
restart guidance; unrelated accounting does not invalidate a page. Retain the
4,000-character content limit and existing surrogate-pair protection.
Add scope and latest review detail to this same surface. Task, objective,
scope, and review pages must include full contracts/evidence/reports even when
one field spans pages. Dashboard/confirmation views must offer a way to inspect
all 200 nodes and long requirements, not merely '+N more' before approval.

## D3 — scope, confirmation, and completion authority

Keep free-text contracts. Add an optional retained scope record to GoalRecord:
the currently approved objective and goal contract, retained task contracts
keyed by stable task ID (including the last title, status, evidence, and
completion timestamp for a removed task), and scope-change receipts containing prior/new text,
reason, and the human confirmation locator/time. Capture existing objective
and contracts when an old record is first successfully mutated; absence of
this additive field is not corruption. Migration captures the surviving record;
it cannot reconstruct scope removed before this fork. Newly introduced task contracts join
the retained set. Plan deletion or skipping does not remove them. Snapshot
contracted task evidence before removal; ordinary task progress updates refresh
the retained view through the same mutation transaction. An unresolved removed
task is reported with its original ID: recreate that task to supply evidence
through update_goal_task, or request a human scope revision. Do not silently
orphan its obligation or introduce a separate evidence-writing tool.

Use the existing /goal-tweak proposal/confirmation path for changing retained
scope. Show the complete before/after objective and changed/removed contracts;
bind the decision to goal ID, work revision, and focus token. A stale decision,
cancel, or no UI leaves scope unchanged. A model-supplied 'approved' field,
PI_GOAL_AUTO_CONFIRM, headless default task confirmation, settings toggle, or
ordinary task-plan confirmation cannot waive scope. Headless callers receive
guidance to complete the existing interactive workflow; no new approval service.

External prompt/contract edits remain readable and visible. Once retained scope
exists, any discrepancy is a pending scope proposal: stop automatic work, show
the changed text, and require the same human tweak confirmation before replacing
execution/audit authority. Preserve the edited body for review; never silently
overwrite it or treat a filesystem write as proof of human approval. Legacy
records without retained scope keep existing reconciliation until first-write
migration. Budget-only metadata edits can still refresh independently.
005 owns this schema-dependent behavior; 006 characterizes legacy reconciliation,
and 012 verifies the combined behavior after both slices. These are tool/protocol
invariants, not a security boundary against arbitrary edits to extension metadata.

Tweak without a replacement preserves the plan. Apply D2's deterministic
title/contract-change reopening rule to every mutation path, including upsert
and full replacement, not only tweak. A human may instead explicitly remove the
requirement in the same scope revision. Unrelated completed tasks stay complete.
Confirmed tweak keeps active active, resumes paused/blocked with pause metadata
cleared and one resume event, and leaves budget_limited gated until budget is
available. Refinement/cancellation never resumes work.

Guided new goals retain explicit proposal confirmation, draft resume/refine/cancel,
and per-goal auditor choice. Fully specified goals need no synthetic question;
minimal read-only reconnaissance remains allowed before confirmation.
Cancelling a question/proposal preserves the draft for refinement. Explicit
/goal-cancel writes a branch-local cancellation tombstone and clears the draft,
so it cannot return on reopen. Cancellation does not change approved goal/focus/
scope or append project lifecycle events; draft session records, transcript, and
independently incurred usage are allowed. A cancelled clear/scope proposal is
similarly a no-op for its target transaction, not for all session activity.

disableTasks/disableContracts affect tools, presentation, and future optional
contracts; they never erase already retained obligations. block_completion
retains its existing optional planning gate; skipped optional uncontracted
tasks need a reason. lightweight_subtasks affects parent gating only.

Keep the latest completion review in authoritative goal metadata with outcome,
work revision, report, timestamp, and bypass origin when applicable. Full
history remains in the existing ledger; a ledger warning cannot erase the
latest rejection or manufacture approval. Before completion, enforce pending
required-task and missing-evidence gates. The separate auditor judges semantic
satisfaction against the retained scope and actual workspace, not claim text.

| Review outcome | Required behavior |
| --- | --- |
| approved | Recheck focus/work revision, commit completion, expose result to executor, archive once after turn settlement. |
| disapproved, malformed/no verdict, provider error | Persist distinct result; remain open; next appropriate response sees durable findings and retrieval. |
| user cancels and chooses continue | Keep open, record cancellation; respect any concurrent pause/unfocus. |
| per-goal skip, global disabled, or user chooses complete without audit | Retain upstream bypass; enforce structural/evidence gates, record origin, label completion unverified/audit-skipped in tool, UI, and archive. |
| stale async result | Diagnostics may be retained; no completion/scope mutation of either old or newly focused goal. |
| archive failure | Preserve recoverable completed record and report failure. Existing /goal-recovery discovers complete-but-unarchived files, including after crash/reopen; confirmed repair retries archival without a new executor/completion turn. |

An audit-skipped outcome is not a scope waiver and must never claim independent
verification. Auditor/Oracle tools and inherited project-resource policy remain
as upstream; neither may call parent goal mutation tools.

## D4 — ownership and stop boundary

Project records win over session snapshots. All boundary changes invalidate
pending operations and queued callbacks from the old session/focus generation.

| Boundary | Focus and autonomous eligibility |
| --- | --- |
| Normal same-session continuation/compaction | Retain explicit focus; reconcile latest record; continue only active + autoContinue + current generation + no stop/steering gate. |
| Reload or reopen same saved session | Restore latest branch-local explicit focus; reconcile disk; eligible active goals can continue. Paused/blocked/limited goals stay stopped; retain the existing interactive paused-resume choice. |
| New session without focus entry | Unfocused by default. Preserve autoSelectSingleGoal as an explicit user setting for a sole open goal; explicit null or missing-ID focus still wins. |
| User forks a session | Invalidate inherited execution authority; append explicit null focus in the new branch before scheduling. Shared goal data is unchanged. A normal unconfirmed draft may be inherited for discussion; a tweak draft is invalidated because its focus is detached. |
| Backward tree navigation | Restore branch-local focus against current project records, never historical progress; suppress automatic work until explicit /goal-focus or /goal-resume in that navigated branch. Replace the in-memory draft from the selected branch's latest draft entry/tombstone; never retain a different branch's live draft. |
| Focus/unfocus/clear | Only user commands choose focus. Invalidate old operations; clear needs confirmation and cancelled clear is a byte-for-byte durable no-op. |
| Delegated child/auditor/Oracle | No parent goal command/tool registration or autonomous projection/continuation; retain existing child filtering and dedicated review context. |

This work does not add a distributed execution lease. Two independently
authorized sessions can still act on the same workspace; storage conflicts
are rejected, but exactly-once external effects across sessions are not promised.
Do not silently allow inherited forks to count as independent authorization.

Bind open draft/task/audit dialogs to branch/session generation as well as goal
and work revision; returning from a stale dialog cannot resurrect its draft.

The enforceable stop boundary is before dispatch of each new goal work tool.
Cancel timers/queued checkpoints and abort in-flight work where Pi supports it;
do not promise to undo effects already dispatched. A deliberate ordinary user
request can still use normal Pi tools while a goal is paused/unfocused.
Keep the distinction between stale autonomous work and unrelated user work.
Exercise user steering and host queued custom/next-turn messages; hasPendingMessages
alone is not proof that every host queue is empty.

## D5 — budgets, blockers, and recovery

Keep existing usage semantics: executor-reported input/output tokens and active
time; do not silently add compaction-summary/auditor/Oracle billing to the goal
counter. Report those auxiliary tokens separately in S3 where exposed.
Charge final/aborted messages once to their originating goal. Persist one
budget-limited transition, cancel continuations, and provide at most one
wrap-up without new substantive tools. Budgets are post-response limits and
may overshoot. A still-exhausted budget cannot be resumed into work; the existing
user-editable goal metadata plus refresh can raise/remove it before resume.

Preserve immediate agent pause with reason/suggested action. The upstream
three-consecutive-identical-blocker rule is model guidance, not a proven runtime
counter; carry it through context and reset its instructions on explicit resume.
Do not introduce a new blocker-detection engine. Keep optional Oracle outcomes,
fingerprint-based reuse, meaningful-work follow-up, configured failure cap,
and read-only consultation. get_goal/echo-only reads do not count as advice
execution. Stall notices steer; they are not evidence of progress/completion.
Active goals may still ask real clarification questions. Repeated get_goal
calls receive existing soft nudges, never a new hard stop solely for inspection.
Preserve the existing empty-turn/nudge limit so automatic inspection-only or
text-only responses cannot create an endless no-progress continuation loop.

Pi owns immediate retries and overflow recovery. Schedule extension recovery
only after agent_settled and recheck goal/generation/user intent at dispatch.
Preserve networkRecovery.maxAttempts=0 as the existing unbounded setting and
positive caps as bounded; tests always set a finite cap and use controlled
timing. Nontransient errors, failed/cancelled compaction, user abort, or a stop
must not masquerade as successful work. No duplicate extension retry while
Pi is still recovering.

## D6 — package and live validation

In 001 pin development/peer Pi packages to tested 0.85.1; retain the declared
Node floor only if checked. In 012 run install/load tests on Node 22.15 and 24
or explicitly narrow the declaration to the tested floor. Use a distinguishable
package name @justinbeausoleil/pi-goal-x for the private candidate, fork repository
metadata, and a version identifying it as a fork prerelease. No npm publication.
Distribute the trial from an exact fork commit/packed tarball; record both SHA
and tarball hash. Update installation text so it selects the fork, and include
its notice/license in the packed files. Do not alter upstream's publication gate
to publish this fork.

Use an isolated Pi agent directory and synthetic project with exactly one goal
extension. Retain supported legacy goal/session reads and user-edited prompt
reconciliation. Rollback means restore the pretrial package/settings/data copy,
retaining fork-written data separately; do not claim upstream can losslessly
rewrite new fields or larger plans. Test both a migrated original record and a
fork-modified record backup/restore. Ticket 014 can record a no-go decision
without more testing; prepare a recommended live trial only after the broader
six-run gate passes.

### First: bounded benefit diagnostic

Reuse the existing native Pi harness, public setup operations and deterministic
compaction adapter. Compare original upstream
`fe430b251eeaff4ff7c041085fd05458b2776cb9` with the already-qualified
`e47f475a37ddc04db1e68199c33041888a3d32c1` reliability.2 artifact, in separate
isolated sessions with equivalent goal state. Freeze one small post-compaction
work scenario and independent expected output before any model call. Public
setup selects the current task and records completed work; do not spend model
responses creating plans or depend on model-invented task IDs reaching a trigger.
Use the same recorded lossy summary, work inputs, native tool profile and model
settings for both versions. Let each extension supply its own normal goal
context; do not hand-inject the fork's answer into the baseline request.

Use Qwen3.6-35B-A3B-8bit with thinking off, temperature 0.2 and top-p 0.95.
Allow at most two executor responses per version, 256 generated tokens each
(including any reasoning), four requests total. Preflight each complete outbound
request, including system text, tool schemas, chat template and prior results,
with the configured tokenizer: at most 4,096 input tokens per request. If the
count or output cap cannot be enforced, stop before dispatch and report the
probe invalid. Maximum submitted input is 16,384 tokens and maximum generation
is 1,024 tokens, 17,408 combined; actual usage must also be recorded.
Disable model-based setup, summary generation, audit, Oracle, retries and
recovery for this diagnostic. Enforce a five-minute wall-clock limit for the
whole pair and abort outstanding work at the limit. No automatic resampling,
second model, fixture tuning or candidate repair followed by another model run.

Score actual work effects automatically: correct next-task work, preservation
of the pending requirement, and no repeated write to completed work. Freeze
these assertions with the fixture; a prose claim or remembered task ID is not
sufficient. Report one compact comparison with checks, input/output usage,
elapsed time, errors and evidence locators. Call it a positive diagnostic only
if the fork passes all checks and upstream fails at least one; otherwise report
no benefit demonstrated, regression, or inconclusive as appropriate. Truncation,
unavailable models, unequal setup or budget failures are inconclusive, never
evidence of benefit. Even a positive result is one scenario, not statistical
proof or the six-run acceptance gate.

Run unattended and inspect one final result; no repeated Codex polling or model
reviewers. The Qwen budget does not include Codex orchestration tokens. Reuse
012's qualification and existing deterministic evidence; run only the smallest
offline check needed for any new probe plumbing. No new benchmark framework.
Stop after the report and use 014 for the decision about any further investment.

### Deferred: broader behavioral acceptance (unchanged quality gate)

The following protocol is retained for a separately authorized future matrix.
It is not the current ticket frontier and must not restart automatically.

Freeze the S3 fixture and candidate before execution. Six runs:
Qwen3.6-35B-A3B-8bit and Qwen3.8-27B-8bit, each off/low/low thinking, fixed seeds
101/102/103 for input generation (not a claim of deterministic model sampling).
Use configured 65,536 context and 8,192 max output. Record exact provider/model
IDs, generation settings, Pi/Node/candidate versions, and actual returned usage.

The synthetic project is a tiny JavaScript data-processing task: create a CSV
normalizer for a fixed 40-row UTF-8 input (quoted commas, empty values, duplicates,
invalid rows), produce normalized JSON and exact aggregate totals, add executable
checks, and document the input/error rules. Freeze the expected outputs in the
harness independently of the executor. Use six required contracted milestones:
parse, normalize, aggregate, rejection report, checks, and documentation.
The executor creates/updates them via public goal tools and runs real work
tools; independent harness checks cannot be replaced by the executor's tests.
The separate deterministic 200-node fixture owns capacity acceptance.

Each S3 run has three real Pi compactions after successive work milestones:
manual, threshold, manual, all with actual model-generated summaries. Use
deterministic non-instructional synthetic conversation ballast for threshold
pressure; record its size and confirm the host threshold path actually fired.
Do not lower the advertised context size or inject the answers in ballast.
If the run never reaches a required boundary, it fails that criterion.
Overflow remains deterministic S1 coverage, avoiding an uncontrolled live
overflow benchmark. Auditor is enabled and uses the same local model.

Limit each run to 60 executor responses and 30 minutes, including compaction
and audit. Configure at most two extension network-recovery attempts.
These limits end a failed trial; they are not production defaults. Report all
six scheduled outcomes, including unavailable-model, timeout, tool/protocol,
summary, artifact, premature-completion, and audit failures. No retry-until-pass.
If a future matrix is authorized, a changed candidate uses a newly numbered
matrix; retain older results. User-directed cancellation records interrupted
and unstarted slots separately from completed failures and cannot earn a pass.
Passing requires six of six runs with exact expected artifacts, all contracts
satisfied, no duplicate completed transitions, and audited completion. Failed
validation blocks adoption, not publication of honest results.

## Navigation and checks

| Concern | Existing implementation and prior tests |
| --- | --- |
| Starts/context | extensions/goal-events.ts, goal-state.ts, goal-runtime.ts; tests/integration/extension.test.ts, tests/goal-compaction.test.ts, tests/overflow-regression.test.ts |
| Tasks/details | extensions/goal-task-tools.ts, goal-service.ts, goal-detail.ts, goal-record.ts; tests/goal-task-tools.test.ts, goal-payload-separation.test.ts, goal-task-lifecycle.test.ts |
| Draft/scope | extensions/goal-drafting.ts, goal-draft.ts, goal-task-confirmation.ts, goal-questionnaire.ts; tests/goal-drafting.test.ts, goal-tweak-status-persistence.test.ts |
| Ownership/storage | extensions/goal-pool.ts, goal-session-safety.ts, storage/; tests/goal-pool.test.ts, goal-unfocus.test.ts, goal-recovery.test.ts, goal-turn-transaction.test.ts |
| Stop/budget/recovery | extensions/goal-accounting.ts, goal-core-tools.ts, goal-oracle.ts, goal-runtime.ts; tests/goal-budget.test.ts, goal-oracle.test.ts, goal-network-recovery.test.ts |
| Completion | extensions/goal-completion.ts, goal-policy.ts, goal-auditor.ts; tests/goal-deferred-archival.test.ts, goal-auditor.test.ts |
| UI/package | extensions/goal-settings.ts, goal-commands.ts, widgets/; tests/goal-layered-settings.test.ts, goal-command-palette.test.ts, goal-dashboard-golden.test.ts, tests/e2e/ |

For each ticket, record a baseline red case for changed behavior (or a passing
characterization for preservation), the targeted command, green result, and
limitations. Reuse existing runner/test adapters and port the small real-Pi
lab reproduction in 001; new tests must be discoverable by the runner.
The fast runner substitutes SDK pieces, so test:all alone cannot prove S1.

For runtime/package integration run npm ci --ignore-scripts, npm run check, npm run lint,
npm run test:all, npm run test:selfcheck, and npm pack --dry-run. For changed
payloads run npm run context:gate and npm run context:provider-check; retain
applicable benchmark/CI gates, including bench:gate:naf, the ranking-updater
check, and production dependency audit. In 012 also run the real-SDK serial
suite and record full-development audit results; SDK adapters cannot substitute
for it. Record baseline
failures with the exact upstream/candidate commands; do not quietly delete
them. The package ticket also checks the real installed artifact and supported
runtime matrix. Review each fixed-base diff against standards and spec.
Documentation-only replanning requires diff/link/consistency checks and review
against both standards and spec; it does not rerun package qualification or
consume model calls. A probe-only harness change gets its focused offline check.

Update docs/architecture.md when runtime behavior changes, then ticket
evidence and [milestones](specs/2026-09-08-goal-reliability/MILESTONES.md).
Historical planning changes modified no runtime code or dependencies. The
approved implementation keeps live Pi configuration unchanged.
