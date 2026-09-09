# pi-goal-x agent flow

This describes the reliability fork on Pi 0.85.1. Package and real-model
qualification status is recorded in [release notes](../RELEASE_NOTES.md).
Historical implementation plans remain historical records; the current module
and storage details are in [architecture](architecture.md).

## Roles and execution

The user owns the objective, focus, scope revisions, resumption and abandonment.
The executor performs authorized work and reports task progress or a terminal
outcome. A separate auditor inspects completion claims and workspace evidence.
The extension retains authoritative project state and coordinates Pi's lifecycle.

A guided `/goal` or `/sisyphus` starts discussion with three drafting tools.
The user confirms a proposal before execution starts. `/goal-direct` and
`/sisyphus-direct` create an explicitly supplied objective immediately.

Every executor context event reconciles the focused record and supplies current
identity, work revision, lifecycle action, requirements, task, budget and relevant
review/Oracle/user guidance. Automatic goal text is bounded to 10,000 characters;
omitted detail has a lossless retrieval reference. Custom-message starts also
establish execution identity and enforce stale-trigger guards. Dynamic goal state
is not carried in the static system prompt.

Pi owns compaction and immediate retries. Tiny checkpoints retain identity,
while native manual, threshold and overflow compaction preserve durable project
progress. Summarizer and child-review contexts stay separate. A stopped or stale
checkpoint cannot authorize work; ordinary new user requests remain distinct.

## Public tools and commands

The normal profile has five goal tools, or three when task tools are disabled.
Guided discussion temporarily advertises only `goal_question`,
`goal_questionnaire` and `propose_goal_draft`. Lifecycle validity is enforced
at execution; advertising a tool is not authority to bypass a stop.

| Tool | Behavior |
| --- | --- |
| `create_goal` | Create and focus a goal after an explicit user request. |
| `get_goal` | Inspect the focused goal, work revision and paged detail. |
| `update_goal` | Request completion, report blocked, or pause with a reason and suggested action. |
| `set_goal_tasks` | Upsert or replace the plan through validated, confirmed structural mutation. |
| `update_goal_task` | Apply task progress/evidence with the current work revision. |

The 16 commands are unchanged from the original runtime baseline:

| Command | Behavior |
| --- | --- |
| `/goal`, `/sisyphus` | Discuss and confirm regular/ordered goals. |
| `/goal-direct`, `/sisyphus-direct` | Start explicitly supplied regular/ordered goals. |
| `/goal-list` | List open goals and focus. |
| `/goal-status` | Show the dashboard; `verbose` exposes full task detail and `health` diagnoses state. |
| `/goal-focus`, `/goal-unfocus` | Choose or detach this session's focus. |
| `/goal-settings` | Edit layered settings or remove an override. |
| `/goal-tweak` | Discuss and confirm a scope/plan revision. |
| `/goal-clear` | Archive after confirmation; cancellation preserves the record. |
| `/goal-cancel` | Persist cancellation of an unconfirmed draft. |
| `/goal-pause`, `/goal-resume` | Stop or explicitly resume eligible work. |
| `/goal-refresh` | Re-read externally changed goals and settings. |
| `/goal-recovery` | Report storage problems; `repair` confirms backup and safe repair. |

## Task plans and retained requirements

Plans support 200 nodes; upsert accepts at most 50 entries per call. Replacement
specifies the full tree/order. Existing-plan structure and progress changes
require `expected_work_revision` from a current read or successful mutation.
Usage and wall-clock changes do not invalidate this content fingerprint.
Validation rejects the entire invalid/stale batch before it changes progress.

Requirements live in the goal's retained scope as well as the editable plan.
Deleting/skipping tasks, changing lightweight flags or hiding tools cannot waive
those requirements. Required contracts need current evidence; a nonempty evidence
claim alone is not independent verification. Ordinary task confirmation cannot
approve scope removal. The user-owned tweak workflow binds scope confirmation to
the goal, work revision and session/focus generation.

Changing a completed task's title/contract reopens it and clears current evidence.
Historical evidence remains history. External requirement edits remain visible
as pending proposals rather than silently replacing approved execution scope.
Legacy records remain readable and migrate through the existing mutation path.

`get_goal` pages full objectives, task fields, retained scope, history and latest
review, with at most 4,000 content characters per page and content-bound cursors.
Draft cancellation persists a branch-local tombstone. Forks may inherit normal
discussion, but they do not inherit autonomous execution authority.

## Persistence, ownership and stops

Project goal files are authoritative; session entries restore branch-local focus
and drafts. GoalService owns writes, archives and best-effort ledger appends.
Per-goal locks and storage revisions reject conflicting work; accounting can
rebase its additive usage without overwriting newer user changes.

Same-session reopen restores explicit focus against current disk state. New
sessions start unfocused unless the existing sole-goal selection setting applies.
User forks persist null focus; backward tree navigation suppresses autonomous
continuation until explicit focus/resume. Delegated children cannot register or
acquire parent goal controls.

Pause, abort, unfocus, clear, focus changes and pending user steering invalidate
old operations and continuations. New goal work tools are blocked before dispatch.
Effects already dispatched are reported honestly, not claimed undone. Escape
inside a goal modal belongs to that modal; Escape in an audit offers its existing
cancel/continue or complete-without-audit choice.

## Completion and recovery

Completion checks lifecycle, configured task gates and retained requirements.
Blocked goals require explicit resume first. Active, paused and budget-limited
goals may complete when the evidence permits. `completion_summary` is an optional
untrusted executor claim; it never substitutes for independent review.

The auditor gets approved requirements and actual workspace tools in its own
session. It cannot invoke parent goal mutations. Approval, disapproval, malformed
output, provider error and cancellation are distinct outcomes. Latest review
metadata records outcome, report, reviewed work revision, time and bypass origin;
ledger history preserves older outcomes after later reviews. Rejection survives
compaction/reopen even if the best-effort ledger fails.

Audited completion requires approval. Per-goal opt-out, resolved disabled settings
and explicit Escape bypass remain user-owned and are labelled audit-skipped.
None waives retained scope. Success messages/cards wait for the authoritative
completion write. An actual audit may still be diagnostic history if that write
fails, without claiming the goal completed.

The tool result observes the complete record before deferred archival at turn end.
Archive write/unlink failure keeps the active record authoritative and reports
its location. Completed records outside the open pool appear in recovery.
Confirmed repair backs up exact bytes, rechecks the selected record under lock
and retries archival without another executor/auditor turn. A stable completed
archive path prevents duplicate copies across accounting updates. Ledger failures
produce warnings without undoing a successful archive.

## Budgets, blockers and provider recovery

Executor-reported input/output tokens and active time belong once to the goal
that incurred them, including retries, aborts, focus changes and responses after
archival. Compaction/auditor/Oracle usage is separate. Exhaustion produces one
budget-limited transition and at most one wrap-up; it never means completion.
Resume cannot bypass an exhausted budget that has not been increased or removed.

The three-consecutive-blocker rule remains model guidance, not a runtime counter.
Optional Oracle advice has fingerprint-based reuse and a meaningful-work
follow-up gate. Inspection alone does not discharge advice. Stall and repeated
inspection messages steer rather than claim progress. Existing no-progress
limits prevent endless automatic empty turns.

Extension network recovery waits for Pi's settled lifecycle and rechecks goal,
generation and user intent at dispatch. It does not duplicate Pi's immediate
retry/overflow recovery. Positive retry caps remain bounded; the existing zero
setting means unbounded recovery until another stop applies.

## User interface and verification

The dashboard, expanded task view and status share the same model. Ctrl+Shift+T
expands/collapses it; Escape collapses before pausing work. Navigation keys scroll
the expanded view, and Ctrl+Shift+A persists the focused goal's auditor choice.
The widget factory retains its mounted component so those callbacks and render
invalidations reach the displayed widget. Layered global/project/environment
settings and disabled features preserve existing records and obligations.

Native lifecycle fixtures exercise the Pi loader, commands, tools, compaction,
reopen and filesystem faults. Package qualification also installs actual tarballs,
checks supported Node versions and restores pretrial package/settings/data while
retaining fork-written data separately. The six-run Qwen artifact gate is a
separate acceptance step; passing deterministic checks does not imply adoption.
