# pi-goal Architecture

This document describes the shipped `pi-goal` extension as it exists now. It focuses on implemented behavior.

## Runtime shape

`extensions/goal.ts` is a thin installer (under 50 lines). It registers the two
custom message renderers, builds the shared `GoalCore` (goal-state.ts), and
registers the command palette, the tool surface, and the lifecycle event
handlers from their dedicated modules:

| Module | Responsibility |
|---|---|
| `goal.ts` | Thin installer: renderers + module registration only |
| `goal-state.ts` | `GoalCore`: all mutable state (pool, focus, audit/UI flags), `GoalService`/`GoalRuntime`/`GoalAccounting` wiring, persistence and reconciliation closures, widget status |
| `goal-tools.ts` | Registration composition only: a 14-line installer that wires `registerCoreTools` + `registerTaskTools` |
| `goal-core-tools.ts` | `create_goal` / `get_goal` / `update_goal` executors plus the blocked flow |
| `goal-completion.ts` | The completion transaction: `runGoalCompletionFlow` (audit orchestration) + shared `commitGoalCompletion` |
| `goal-task-tools.ts` | `set_goal_tasks` / `update_goal_task` executors plus flat parent-linked conversion, id-stable merge, `countTasks` |
| `goal-task-confirmation.ts` | Task-only result boundary (`{decision}`, no auditor toggle) with neutral Confirm task list / Keep current tasks labels |
| `goal-commands.ts` | The curated fourteen-command palette and its handlers |
| `goal-events.ts` | Lifecycle event handlers (`message_start`, `context`, `turn_start`, `tool_call`, `tool_execution_end`, `turn_end`, `message_end`, `session_start`, `session_before_compact`, `session_compact`, `session_tree`, `before_agent_start`, `agent_end`, `agent_settled`, `session_shutdown`) |
| `goal-widget.ts` | Terminal input keybindings (Esc pause / abort-audit, Ctrl+Shift+T dashboard) and the hidden debug helpers |
| `goal-format.ts` | Pure formatting/message-introspection helpers and renderers |
| `goal-service.ts` | `GoalService` — the sole mutation boundary: ordered reconcile → id/focus-revision validation → clone-mutate → write/archive → ledger → memory commit → returned effects |
| `goal-runtime.ts` | `GoalRuntime` — continuation scheduling, stale checkpoint state, turn-stop guard, one-shot steering reminders |
| `goal-accounting.ts` | `GoalAccounting` — serialized idempotent token/time accounting, budget helpers |
| `goal-record.ts` | Goal record types, creation, cloning, usage normalization, persisted-record migration |
| `goal-pool.ts` | Open-goal pool helpers, focus resolution, list output, selector labels, unfocused summaries |
| `goal-core.ts` | Compact display formatting, status labels, objective title cleanup |
| `goal-contract.ts` | Record/input parser: verification-contract extraction and objective prompt-safety |
| `goal-policy.ts` | Lifecycle policy and validation (completion/blocked/resume/task gates), task-tree helpers, compaction policy, result reports |
| `goal-auditor.ts` | Independent pi auditor agent prompt/config/decision parsing and completion audit execution |
| `goal-ledger.ts` | Single-file goal ledger append/read/reconstruction (18 event types incl. `task_reopened`) |
| `goal-draft.ts` | Drafting prompt/confirmation text helpers (goalDraftingPrompt, buildDraftConfirmationText, renderConfirmationTasks, GoalDraftingFocus) |
| `goal-drafting.ts` | Guided drafting orchestration: durable `pi-goal-draft` session entries (survive compaction/tree navigation), resume/replace/cancel protection, transient drafting profile, `goal_question`/`goal_questionnaire`/`propose_goal_draft` tools, per-draft auditor selection |
| `goal-questionnaire.ts` | Structured question/answer UI (`runGoalQuestionnaire`, `showProposalDialog`) used by the drafting tools and confirmations |
| `goal-tool-names.ts` | The five published tool-name constants, lifecycle-dependent profiles, work/progress classification, post-stop allowlist |
| `goal-detail.ts` | Lossless objective/task/scope/history paging with content-bound cursors |
| `goal-scope.ts` | Legacy scope derivation, retained requirements/receipts, structural reopening and required evidence checks |
| `goal-ledger-index.ts` | Incremental per-goal activity, audit, lifecycle, and Oracle projections |
| `goal-task-index.ts` | Content-keyed task snapshots shared by prompts, tools, and dashboard models |
| `prompts/goal-prompts.ts` | Bounded five-tool steering prompts (active-goal, continuation, stale-checkpoint, unfocused, budget-limited) |
| `storage/goal-files.ts` | Goal path safety, serialization/parsing, active-file scanning, active-file writes, archive writes, prompt-body merge from disk |
| `widgets/goal-widget.ts` | Above-editor Goal Beacon component |
| `widgets/goal-notifications.ts` | Widget-style notification text for goal lifecycle toasts |

The runtime is a focused-goal view over a project goal pool:

```ts
let goalsById: Map<string, GoalRecord>;
let focusedGoalId: string | null;
```

`goalsById` is reconstructed from `.pi/goals/active_goal_*.md` plus compatible
legacy session entries. `focusedGoalId` is reconstructed from branch-local
`pi-goal-focus` session entries. The focused id is not serialized into goal
markdown.

## Executor requests (reliability fork)

Development and peer dependencies are pinned to Pi 0.85.1. Custom-message
checkpoints bypass Pi's before_agent_start hook. The message_start handler
binds their marker identity; the context handler reconciles focused goal state
and adds an ephemeral pi-goal-context message for each executor request.
Normal user prompts reset continuation bookkeeping. Dynamic goal instructions
are no longer appended to the system prompt, and projections are not saved
in the session or added to the separate summarizer request.

Checkpoint metadata and content must identify the same goal and carry the
runtime UUID/sequence of its current, single-use issued receipt. Stops clear
that receipt; replay or a previous runtime's marker cannot resume work.
An old nextTurn attachment before a fresh user's first response is context
only; a later follow-up must establish its own valid trigger. Stale or malformed
checkpoints receive stop guidance; tool_call rechecks eligibility before work
dispatch. Read-only inspection stays available, and a later ordinary user
request can use normal work tools. agent_end cannot schedule another goal from
a rejected checkpoint. An explicitly queued successor still runs after that
old delivery settles. Persisted checkpoints remain tiny v2 markers.

Runs retain their original goal and focus-generation token across responses.
Pause, switch and clear cancel goal-owned work; unfocus and successful goal
replacement use the same boundary. An active goal becoming stopped invalidates
its run even when the agent initiates the transition. Task confirmation retains
its response-only stop so the active goal can continue at a new checkpoint.
Late aborts cannot pause a freshly resumed or newly selected goal. Ordinary
user work begun while the goal is paused remains available through these
controls. Already-dispatched effects are preserved; supported running tools
are aborted. Native Pi settlement delivers queued user steering before any
new automatic checkpoint.
At dispatch, queued ordinary user input also blocks new goal work without
requiring a separate pause command. Native abort signals invalidate the run
immediately, including while a task dialog or review is awaiting a result.
Oracle receives the parent signal; the auditor retains its separate controller
so Escape can cancel only the review and offer the existing completion choice.
Goal mutation tools request sequential execution from Pi. Within one assistant
batch, agent pause waits for an earlier task dialog/audit/Oracle result; it then
preserves its reason/suggestion and stops later work. User controls can interrupt
those pending operations immediately. This does not add a cross-session lease.

Automatic goal text, including the retained checkpoint, is capped at 10,000
characters. Long data uses marked excerpts and detail/history retrieval links;
large active prompts omit optional pending previews to reserve room for lifecycle,
audit, Oracle and stall guidance. Stopped projections retain task identity,
ancestors, counts, goal contracts and audit rejection without authorizing work.
Budget stop instructions remain after the one-time wrap-up. Inactivity is checked
before turn_start resets the activity clock; its notice reaches the matching
active goal's next context. Malformed checkpoints, including missing/oversized
identities, are rewritten as bounded unusable markers before projection.

The real-loader tests exercise four command starts, explicit create_goal,
checkpoints, rejected markers, and ordinary user work. The compaction worker
builds a public plan and crosses three manual, threshold or overflow compactions,
including threshold within a run. It also checks stopped states, long fields,
native Oracle/auditor responses and separate child contexts. Package qualification
remains ticket 012; real-Qwen acceptance remains ticket 013.

## Sole mutation boundary

`GoalService` owns the ordered mutation pipeline. Every goal-file write,
archive, and ledger append routes through it:

```text
reconcile (disk wins over stale memory)
  → expected-id / focus-revision validation (async operations invalidated on focus change)
  → mutate a clone (never the live object)
  → write or archive the active file
  → append ledger events (best-effort; failure emits a warning diagnostic)
  → commit to memory + focus
  → return effects (ok, goal, focusChanged, messages)
```

If the write fails, nothing commits and nothing is appended. If the ledger
append fails after a successful write, the transition still stands and the
failure is surfaced through the `onDiagnostic` hook (an observable
`severity: warning, source: ledger` diagnostic) without rolling back the
authoritative state write. Handlers keep validation and
runtime/UI effects; they never touch storage directly. `goal.ts` has zero
direct write or ledger calls.

During a response, mutations may be buffered until a turn boundary. A live
lock retains that buffer for retry and reports pending persistence. Other
access/write failures discard unsaved work, restore the authoritative record,
retain incurred usage and report the storage error. Immediate mutation failures
return an unsuccessful outcome; user pause fields and resume controls cannot
commit to memory before their write. Lifecycle replacements validate the whole
prior normalized record, apart from usage/update time, as well as work revision.

Clear flushes an existing buffer before attempting an immediate archive and
detaches focus only after successful archival. Archival writes the copy before
removing the active file. If removal fails, the active file remains authoritative;
focus and success-ledger entries stay unchanged. The diagnostic identifies the
retained archive copy and asks for restored storage access and an explicit retry.
Retrying the unchanged record updates that same copy and completes removal.
An intervening record update can yield a different timestamped archive path;
the earlier partial copy remains retained evidence, never execution authority.

## Lifecycle

```text
/user command or explicit create_goal request
  ├─ /goal [seed] or /sisyphus [seed]
  │    └─ guided draft: clarify/questionnaire → objective + optional task proposal → explicit confirmation
  ├─ /goal-direct <objective> or /sisyphus-direct <objective>
  │    └─ direct creation: nonempty objective → active goal file → focused → autoContinue
  ├─ focused active goal
  │    ├─ autoContinue queues checkpoint turns
  │    ├─ update_goal({status:"blocked"}) records a distinct blocked state after the same
  │    │   blocker recurs on three consecutive turns
  │    └─ update_goal({status:"complete"}) starts the independent auditor; <approved/> archives
  ├─ paused/blocked goal
  │    ├─ /goal-resume restarts autoContinue
  │    └─ update_goal(complete) can complete from existing evidence
  ├─ multiple open goals
  │    ├─ /goal-list shows the project goal pool
  │    ├─ /goal-focus chooses the session focus
  │    ├─ /goal-unfocus clears only the session focus and leaves the shared goal open
  │    └─ unfocused sessions guide the user to choose instead of letting the agent decide
  └─ /goal-clear archives the focused goal after confirmation (cancel is a durable no-op)
```

## Goal pool and session focus

The disk layout supports multiple active files. The extension treats those
files as the durable project-level open goal pool:

```text
.pi/goals/active_goal_<timestamp>_<id>.md
```

`readActiveGoalPool(ctx)` scans that directory, ignores invalid files and
symlinks, parses each safe active file, sanitizes metadata paths, drops
completed records, and returns a deterministic `Map<goalId, GoalRecord>`.

Session focus is separate. Focus changes append a custom session entry:

```ts
{
  version: 1,
  focusedGoalId: string | null,
  reason: "created" | "selected" | "unfocused" | "resumed" | "completed" | "cleared" | "aborted" | "migrated" | "navigated"
}
```

Because this is stored with `pi.appendEntry("pi-goal-focus", ...)`, it is
session/branch-local and is not sent to the LLM. On `session_start` and
`session_tree`, `loadState(ctx)` scans `ctx.sessionManager.getBranch()` for the
latest focus entry, scans active goal files, and resolves focus as follows:

1. Use a valid focused id from the latest focus entry.
2. If the latest focus entry explicitly has `focusedGoalId: null`, or points at
   a missing/stale goal, remain unfocused.
3. If no focus entry exists, merge a compatible legacy `pi-goal-state { version: 3, goal }`
   goal and focus it. If disk already has the same id, the disk record wins and
   the legacy session record only supplies focus.
4. If no focus entry exists and `autoSelectSingleGoal` is enabled, auto-focus
   the sole open goal for compatibility. The default is disabled.
5. Otherwise remain unfocused until the user explicitly selects a goal.
   `/goal-unfocus` appends a null focus entry so the current session stays
   detached without modifying the shared goal or appending a project-global
   focus event.

Native tree navigation reloads current project progress and holds automatic
continuation until explicit focus/resume. The existing hold used for drafting
also covers navigation; compaction cannot release it. A held active goal's
context exposes its approved state and resume guidance without granting work
authority. Forks append explicit null focus before any scheduling.
The navigated branch records focus with reason `navigated`, preserving the
hold through reload/reopen. Explicit focus/resume or a bound human scope
confirmation records the released focus; no project lifecycle event is added
solely to hold or release session authority.

Focus is human-owned. No agent tool can switch focus. Lifecycle tools operate
only on the focused goal.

Paused-reopen confirmation is bound to the current record and focus/session
generation. External prompt or lifecycle changes invalidate the old decision;
tree navigation or session replacement prevents the old callback from resuming
work. A missing cached explicit focus triggers an authoritative file scan before
it is treated as unavailable. Snapshot entries are normalized and path-checked;
unsafe embedded paths never replace the authoritative file's actual location.

## Storage diagnosis and repair

`/goal-refresh` bypasses the pool/parse cache, reports changed records and
reconciles focus. Legacy prompt-body edits and legacy session focus remain
readable. `/goal-status health` and `/goal-recovery` are read-only; the recovery
report performs fresh reads, including unreadable files and malformed ledger
lines, without repairing them.

Confirmed recovery backs up each repair target in a unique directory under
`.pi/goals/.recovery-backup`. It rechecks lock content and file identity before
removal, including changes during backup copying. Snapshot refresh requires a
successful authoritative scan and write before replacing its cache. Failed
backup/scan/read/write operations produce explicit diagnostics and retain valid
progress. Cancelled or stale-session confirmations apply no repair.

## Goal styles

### Regular goal

Regular goals are open-ended objectives. The agent decides the next concrete
action each checkpoint turn, then completes only after the objective is
actually satisfied.

### Sisyphus goal

Sisyphus is a light variant of the same goal lifecycle. It does not have a
separate execution state machine or step counter. The only differences are
prompt/criteria level:

- the objective is written as numbered ordered steps with per-step done criteria;
- continuations remind the agent not to rush, skip, or invent preflight steps;
- completion still uses `update_goal(status="complete")`, with the stricter
  expectation that the whole ordered objective is actually satisfied.

## Creation and tweaking

`/goal [seed]` and `/sisyphus [seed]` begin guided drafting. The temporary
draft profile exposes only question/questionnaire/proposal tools. The agent
clarifies intent, proposes the full objective and an optional task tree, and
the user explicitly confirms or continues refining. `/goal-direct` and
`/sisyphus-direct` bypass this only when the objective is already final.
Cancelling a question or proposal retains the discussion; `/goal-cancel`
writes a branch-local cancellation tombstone. On tree navigation/reopen, the
selected branch's latest draft entry replaces memory, including its auditor
choice and questionnaire answers. Awaited drafting decisions are bound to the
draft object, session/focus generation and content-based work revision; late
answers cannot recreate a cancelled/replaced draft or apply to changed work.
GoalCore owns a session-local continuation hold while drafting, including after
explicit cancellation. Confirmation, creation, or explicit focus/resume releases
it; reload restores D4 eligibility and a live branch draft reinstates the hold.
Profile refreshes consult the actual draft independently of this hold, so task
settings cannot end the discussion. The event boundary remembers a drafting
run through cancellation and blocks new work-tool dispatch before settlement;
read-only reconnaissance and drafting tools remain available. A fresh ordinary
user message can use normal tools after cancellation. The approved goal can
remain active while its user discusses a revision. Discussion context preserves
current pause/block reasons, budget gates, and audit/Oracle/compaction guidance;
any suggested implementation waits for confirmation or explicit resumption. The native
host's fork start detaches focus before restoring drafts or scheduling work;
a normal discussion can survive, while a detached tweak is tombstoned.

`/goal-tweak <change>` starts the same guided-confirmation process for the
focused goal. It preserves the task list when no replacement is proposed and
records `goal_tweaked` (plus `task_list_set` if applicable) only after the
user confirms.

## Command focus behavior

- `/goal [seed]` starts a regular guided draft; bare `/goal` asks what to accomplish.
- `/sisyphus [seed]` starts a Sisyphus guided draft.
- `/goal-direct <objective>` and `/sisyphus-direct <objective>` create directly without drafting.
- `/goal-list` prints all open goals with id, status, mode, usage, objective title, path, and a focus marker.
- `/goal-status health` performs a read-only coherence check for focus, lifecycle, goal-file presence, malformed ledger entries, task progress, and token-budget pressure; it never acts as a completion verdict.
- `/goal-focus` uses `ctx.ui.select` when multiple goals are open and updates only session focus.
- `/goal-unfocus` writes a null session focus entry, clears continuation/runtime state, aborts goal-owned work and audits for that session, and leaves unrelated ordinary user work, the shared active goal file and project-global focus ledger unchanged. Focus revision tokens prevent pending completion and task-list results from mutating a goal after detachment.
- `/goal-resume` resumes the focused paused goal; when unfocused with multiple open goals, it asks the user to choose. Choosing an already active goal only focuses it.
- `/goal-clear` asks for confirmation (with the goal's one-line summary) and archives only the focused/selected goal; cancelling is a byte-for-byte no-op with no file, focus, or ledger change, and headless runs return guidance without mutating anything.
- `/goal-pause` pauses the focused active goal; it asks the user to choose when unfocused with open goals.
- `/goal-settings` renders and dispatches every persisted field from one declarative row table: booleans (`disableTasks`, `disableContracts`, `autoSelectSingleGoal`, `disabled`) toggle directly, `provider`/`model` edit and clear, `thinkingLevel` accepts every level and rejects unknown values, and `subtaskDepth` validates the full input string (whole positive safe integers).

## Tool surface

The extension registers five normal-execution tools and three drafting-only tools:

| Tool | Purpose |
|---|---|
| `create_goal` | Create and focus a new goal after an explicit user request (nonempty objective, optional `mode` regular/sisyphus and `token_budget`). |
| `get_goal` | Compact summary by default; lossless objective/tasks/history pages (up to 4,000 content characters), optional task selection, legacy verbose/history forms. |
| `update_goal` | Run outcomes: `complete` (audited from actual evidence; optional `completion_summary` is an untrusted claim), `blocked` (after three consecutive identical blockers), or `paused` (immediate agent pause with required `reason`). |
| `set_goal_tasks` | Upsert at most 50 entries or replace the full tree (at most 200 nodes), with structural confirmation and work-revision validation. |
| `update_goal_task` | Update one task or an ordered atomic batch: start, complete (evidence for contracted tasks), skipped (reason), pending (reopens skipped). |
| `goal_question` | Drafting-only structured clarification question. |
| `goal_questionnaire` | Drafting-only multi-question clarification UI. |
| `propose_goal_draft` | Drafting-only objective/task proposal with Confirm or Continue Chatting. |

Outside drafting, creation and inspection are always advertised. Outcomes are
advertised for active/paused/budget-limited goals; task planning for active or
paused goals; task progress for active goals with tasks. Disabled tasks hide both
task tools. A guided draft replaces goal tools with question/questionnaire/proposal
tools until confirmation or cancellation. Ordinary pi work tools remain available.
The SDK active profile changes only when membership changes. Executors still
validate lifecycle state, including stale calls made after a transition.

Task writes carry `expected_work_revision`, an opaque content hash of the goal
ID, objective/contract, retained scope, ordered task structure/progress/evidence, task gate,
and current task. It excludes usage, timestamps, storage revision, and ledger
activity. Inspection, executor projections, and task mutation results expose
the current value. Initial empty-plan creation may omit it. The mutation
module checks it against reconciled work in both immediate and buffered paths;
the existing per-goal lock and numeric storage CAS still protect disk writes.
At turn flush, a concurrent accounting-only write is rebased under that lock:
only usage, updatedAt and numeric revision may differ from the original base.
The local usage delta is added to the fresh record before the single write and
ledger append. Work, lifecycle and budget changes still reject the buffer.
UI task dialogs capture it before waiting for evidence. Whole-record structural
mutations reject clearing/changing retained task contracts without a bound
human scope revision. Completed tasks
whose trimmed title or contract changes reopen with current proof/timestamps
cleared through every structural path. Unchanged IDs retain their progress.

The mutation service records approved objective/goal contracts and task
contracts keyed by stable ID in optional `retainedScope` metadata. Legacy
reads derive the surviving scope without rewriting files; the first successful
write persists it without changing work identity. Task progress refreshes each
retained snapshot in the same transaction, while deletion preserves its last
title/status/evidence/completion timestamp. Scope pages retain full strings.
Skipped or removed required tasks still block completion until completed with
evidence; recreate removed IDs with their original contracts to supply it.
Task/contract settings and auditor bypass cannot waive these requirements.
Invalid retained metadata rejects the record rather than dropping its scope.

Only the existing interactive `/goal-tweak` confirmation supplies the service's
scope revision intent. Its decision is bound to goal, focus generation and work
revision; auto-confirm, headless calls and model approval fields cannot supply
it. The dialog exposes complete before/after requirements, including removed
tasks, and the service stores prior/new text, reason and session/tool/time
locator in the same authoritative write. A ledger warning cannot erase that
receipt. An explicit replacement revises the retained task set; omitting tasks
preserves it. The tweak-only `verification_contract` field accepts full text,
or null for explicit removal; omission retains the current goal contract.
Task/contract settings cannot implicitly change this reviewed scope.

For migrated goals, differences between the edited objective/contracts and
retained scope are pending proposals. Existing inspection and dashboard views
label the hold and point to `/goal-tweak`; automatic continuation and ordinary
task/completion mutations cannot adopt or overwrite the proposal. The focused
file is parsed at reconciliation, using the existing per-file mtime/size cache
instead of trusting the directory-keyed pool snapshot. This adds filesystem
checks for migrated focused goals. Legacy records retain their existing cache
behavior until first successful mutation; budget-only edits remain independent.
Atomic mutations also inspect the fresh whole record, and buffered writes reject
concurrent work changes even when an external edit leaves numeric revision
unchanged. Accounting preserves proposed text/tree and explicit user controls.

The isolated completion auditor receives the approved retained objective and
goal contract, plus complete retained task contracts and evidence, including
removed nodes. Task/contract presentation settings cannot hide this authority.
Its current planning tree is separately labeled as planning/proposal material;
stored evidence remains an untrusted claim to verify against real artifacts.
The resume policy rejects exhausted budgets with guidance to raise/remove the
budget in goal metadata and refresh before resuming. Tweak confirmation preserves
active status, resumes paused/blocked once, and leaves budget-limited goals stopped.
Disabled task tracking also suppresses new derived task plans and their proposal
previews. Existing tasks remain visible for scope review and remain preserved.

The existing flat-tree converter validates the complete resulting plan. Upsert
edits supplied fields, preserving omitted values; new IDs require a title and
start pending at the root. `parent_id=null` moves to a root. Existing siblings
keep order, while new/moved nodes append in input order. Replacement (including
omitted mode) specifies the complete order/tree and removes omitted
tasks only after confirmation. Unchanged IDs retain progress and timestamps;
current-task focus survives only for a pending node. Cancelling or confirming
a proposal after concurrent work changes leaves that work intact. The original
normal-parent, lightweight-child, and ordered progress-batch gates remain.

Normal prompt/dashboard reads use per-goal ledger indexes: 12 recent events,
64 activity candidates in stable timestamp order, pinned audit/lifecycle state,
and blocker-fingerprint Oracle state plus the latest complete Oracle result.
Pending advice is queried through that index until a recorded follow-up attempt;
the complete structured result is retained as JSON text in oracle_result.advice
and is available through lossless history pages. Legacy summary-only advice is
explicitly labeled incomplete. Derived checkpoints missing the latest-result
pointer rebuild from the ledger. Appends extend these indexes without
copying history. Version 3 derived checkpoints use UTF-8 byte offsets and retain
reconstructed Oracle advice; old or
corrupt checkpoints rebuild from the authoritative JSONL ledger. Full history
is loaded for explicit history/diagnostic requests. Saved goal/session formats
remain compatible. Task presentation caches use content snapshots; usage changes
do not rebuild task trees. Stable prompt rules precede changing goal data and
usage counters, with retrieval instructions beside bounded excerpts.

Warm settings resolution is cached by layer identity and applicable environment
values; public resolved values remain independently editable. Task and prompt
caches compare content fields without repeatedly serializing long contracts.
Compiled detail pages reuse their source and cursor hash; history sources are
invalidated by an opaque ledger generation on append or refresh. Cache size
limits bound retained data; larger requirements remain available losslessly.
Each page exposes goalId, section, optional taskId, contentRevision, exact
content, nextCursor/end and totalChars. The textual result carries the same
identity and content revision. Cursors are canonical base64url and bind to the
selected content; accounting alone leaves them valid. Task evidence is stored
in full through single/batch/UI updates and retrieved with the task pages.

Task confirmation reuses the structural renderer, including full contracts,
and the existing questionnaire viewport. Page keys review all proposal text;
the existing confirm/cancel and auditor choices retain their meaning. The
expanded dashboard uses that viewport in bounded terminals to reach every
rendered row, including long current-task requirements, within the stable dock
height. It preserves latest-completion reanchoring. Compact/unbounded task
views retain their existing navigation. The existing /goal-status verbose
command exposes every task's full title, contract and evidence; its locator is
shown in the expanded footer. The retained standalone overlay also wraps full
task requirements, but the unified dashboard continues to own the shortcut.
Pure ANSI text wrapping/truncation is cached by text and layout arguments across
widgets and dialogs. Live auditor previews scan only the report tail, while the
complete final report remains available. Measurements and the module audit are
in `specs/2026-09-07-comprehensive-optimization/`.

The `tool_call` interceptor blocks work tools after a stop tool has fired in
the same turn, and blocks work tools when the checkpoint that triggered the
turn is no longer actionable (stale checkpoint).

## Accounting, runtime, and token budgets

`GoalAccounting` (goal-accounting.ts) advances the active-time baseline and
retains sub-second remainders across charges and response starts for the same
goal. Pi emits turn_end for final and aborted responses; the event handler
deduplicates response objects there instead of charging aborted messages again
at agent_end. A run retains its original goal record through pause, focus
changes and clear, including its resulting archive locator. Each incurred
delta goes through GoalService's per-goal lock and a fresh record read. Saving
old-goal usage updates that record without changing current focus. Unpaid
deltas remain in the service for retry on refresh/reconciliation and emit a
storage diagnostic. They are in-memory until a write succeeds. Fresh ordinary
work stays separate, including when a new goal is selected before it ends.
`GoalRuntime` (goal-runtime.ts) owns continuation scheduling, the stale
checkpoint state, the turn-stop guard, and one-shot steering reminders.

An optional `token_budget` may be set at creation. When accounted usage
reaches the budget, `accountProgress` transitions the goal to the distinct
`budget_limited` status exactly once (status leaves `active`, so active-time
accounting stops and the transition cannot re-fire), emits a `goal_budget_limited` ledger
event, arms the one-time wrap-up steering, and cancels pending continuations.
`budget_limited` never implies completion.

## Completion output

Completion is explicit and checked by an independent auditor agent.
`update_goal(status="complete")` is valid for active and paused goals; paused
goals do not need to be resumed just to record completion when existing
evidence is sufficient. There is no verification-summary parameter — the
auditor derives the requirements from the objective and any verification
contract and inspects the actual workspace.

Before archiving, the tool starts a separate in-memory pi session with a
focused auditor prompt. The auditor receives the objective, executor
completion claim, and goal metadata, can inspect the workspace with `read`,
`grep`, `find`, `ls`, and `bash`, and must end with exactly one marker:

- `<approved/>` allows archiving;
- `<disapproved/>`, no marker, an error, or abort rejects completion and leaves
  the goal open.

The auditor uses the current/default model unless
`.pi/pi-goal-x-settings.json` overrides `provider`, `model`, or `thinkingLevel`.
The user can Escape an in-flight audit to choose "complete without audit" or
"continue working". Archival is deferred to `turn_end` so the agent can see the
auditor result before the goal is archived. The global `disabled` setting is
an explicit user-owned switch: completion skips the auditor, records
`audit_skipped`, and proceeds through the normal deferred-completion path.

## Disk format and old-data reads

Active and archived goal files live under `.pi/goals/`. Each file has
extension-owned metadata and a user-editable `# Goal Prompt` section. Before
focused commands, tools, and lifecycle hooks act, the runtime re-reads the
focused active file and reconciles lifecycle state from disk; prompt-body
edits are picked up from `# Goal Prompt`. Path safety checks reject absolute
paths, traversal, NUL bytes, symlinks, and paths outside the goal directories.

Old readers remain for backward-compatible reads of existing data:
`readActiveGoalPool`, `readGoalLedger`, `mergeGoalPromptFromDisk`,
`latestAuditorResultForGoal`, and `normalizeGoalRecord` are all retained and in
use. The ledger is append-only JSONL and is never rewritten in place.

## Tests

Local tests live in `tests/` and run with:

```bash
npm run test:all
npm run check
```

`test:unit`, `test:integration`, and `test:all` automatically discover test
entries and run them in one Node process with small test-only adapters for the
SDK values used by handlers. This avoids loading unrelated model-provider and
TUI media modules. The fast path requires Node 22.15+; `test:serial` remains
the slow, real-SDK, process-isolated
compatibility path. The suites cover: surface baselines (lifecycle-dependent goal tool
profile and fourteen commands), golden file/ledger fixtures, stale-continuation behavior,
GoalService mutation boundary, runtime/accounting, token-budget transitions,
task-tool consolidation, verification contracts, the independent auditor,
compaction recovery, and the bounded steering prompts. The separate
`tests/e2e/run.ts` real-model path is manual and opt-in. In `experiments/`,
C20-C26 are the release set and B1-B2/C1-C19 are migrated compatibility cases.

## Hardening

The 2026-08-04 hardening plan
([`specs/2026-08-04-goal-simplification-hardening`](../specs/2026-08-04-goal-simplification-hardening/TECH.md))
is implemented: paused-status normalization (status authoritative, legacy
`autoContinue: true` records stay paused), disk-fresh task transactions with
structural-field clearing, token-budget integer validation, `task_reopened`
ledger semantics with observable diagnostics, the lifecycle-dependent tool
profile, and the supported integration/experiment coverage described above.
(the interim drafting-surface removal was later reversed by the product
correction in the runtime follow-up, which restores guided drafting as a
first-class workflow; see the follow-up section below.)

The runtime follow-up
([`specs/2026-08-04-goal-runtime-follow-up`](../specs/2026-08-04-goal-runtime-follow-up/TECH.md))
then shipped the remaining work: guided drafting is restored as a
first-class, transient user-invoked workflow (questionnaire, proposal
confirmation, atomic creation, durable draft sessions, `/goal-cancel`,
`/goal-status`, per-draft auditor selection); the settings menu is fully
operable; `/goal-clear` confirms; task confirmation uses neutral labels;
completion commits are failure-checked; and cross-process mutations are
serialized with persisted revisions plus per-goal filesystem locks that
return typed conflicts to stale writers instead of overwriting blindly.
