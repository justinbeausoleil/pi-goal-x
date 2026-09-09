# Specification: compaction-safe, large-task goals

Status: approved by the maintainer, 2026-09-08; implementation evidence pending.
Source: [intent](intent.md). Vocabulary: [CONTEXT.md](CONTEXT.md).
Evidence: [triage](docs/research/goal-reliability.md).
Coverage and review: [lifecycle review](docs/reviews/2026-09-08-ticket-red-team.md).

## Problem statement

A user can start or continue a goal without the model receiving its objective
or current task. Compaction preserves stored progress but can remove the
conversation details needed to continue. Large plans also exceed the public
task tool's 50-node limit. These are verified integration/contract failures,
not a demonstrated Qwen-specific defect.

## Solution

Give each executor response a bounded, current view of the focused goal.
Keep objectives, task contracts, progress, and outstanding audit findings
durable outside conversation summaries. Support 200 nodes through incremental
public operations and lossless paged reads. Preserve the original lifecycle,
including drafting, budgets, blockers, user controls, maintenance, and explicit
auditor bypasses. The lifecycle review assigns every phase an owner and proof.

SDLC documents describe development of this goal package. They do not add SDLC
behavior to the product.

## User stories

1. As a user, I can clarify, refine, confirm, cancel, and resume a draft without
   an unconfirmed proposal becoming autonomous work.
2. As a user, I can start a regular or ordered goal directly or through drafting
   and have the first response know the approved objective.
3. As a user, I can build a 200-node plan incrementally without resending or
   erasing unrelated tasks, progress, or evidence.
4. As a user, I can compact repeatedly and continue the current task from
   durable requirements while completed work stays completed.
5. As a user, I retain ordered steps, normal parent gates, lightweight subtasks,
   and optional task tracking.
6. As a user, I can retrieve all omitted objective, task, evidence, scope, and
   audit information exactly, even when one field exceeds a page.
7. As a user, I can confirm a goal revision knowing exactly which requirements
   change; deleting or skipping a planning step alone does not waive scope.
8. As a user, I can pause, resume, unfocus, switch, or clear goals without an old
   continuation starting more tool work.
9. As a user, I can reopen or navigate sessions without rewinding project
   progress or silently starting work from an inherited fork.
10. As a user, I can reach a token budget, see a truthful wrap-up, and retain
    work without false completion or repeated charging.
11. As a user, I retain concrete blocker reporting, optional Oracle advice,
    provider recovery, and the ability to stop them.
12. As a user, I can distinguish audited completion, rejected/error/cancelled
    review, and my explicit choice to complete without independent review.
13. As a user, I retain status, dashboards, settings, diagnosis, confirmed
    repair, and safe archival, including recoverable failures.
14. As the maintainer, I can evaluate the packed fork on both local Qwen models
    using real artifacts and summaries, then choose adoption with a tested rollback.

## Acceptance criteria

Ticket IDs and blocking edges are canonical in the [ticket index](docs/tickets/README.md).

| ID | Observable behavior | Tickets |
| --- | --- | --- |
| G1 | Pi 0.85.1 loads the fork. All four guided/direct regular/ordered starts and subsequent checkpoints deliver focused identity and objective or an exact retrieval reference before work. Stale/unfocused checkpoints cannot execute goal work. | 001 |
| G2 | After tool mutations and manual, threshold, or overflow compaction, the next executor request contains current lifecycle state, task, contracts, and applicable steering. Three successive compactions preserve required work and completed transitions. | 002, 004, 008, 009 |
| G3 | Public operations build 180 nodes and extend to 200, preserve untouched IDs/status/evidence, and atomically reject duplicate IDs, invalid parents, cycles, excessive depth, capacity overflow, and stale work revisions. Ordered and parent semantics remain intact. | 003 |
| G4 | Automatically supplied goal instructions, projections, and retained checkpoint text total at most 10,000 JavaScript string characters per executor request for every accepted input. Explicit detail results have at most 4,000 content characters per page. Omitted content has lossless content-bound retrieval; ephemeral projections never accumulate in persisted chat. | 002, 004 |
| G5 | User/agent pause, abort, unfocus, clear, focus change, and pending steering invalidate stale continuations and block new goal work-tool dispatch. Host overflow recovery cannot also spawn a duplicate continuation. Already-dispatched effects are reported, not claimed undone. | 007, 010 |
| G6 | Reload, reopen, new session, fork, and tree navigation follow the explicit ownership table. Goal records remain authoritative. Corruption, conflicting writes, and failed repair/archive operations cannot silently replace valid progress. Child sessions cannot acquire parent goal controls. | 006, 011 |
| G7 | Completion enforces configured task gates and required contract evidence; plan deletion, skipping, lightweight flags, or disabling display/tools cannot waive retained scope. Audit findings survive compaction/reopen. Audited completion requires approval; user-owned bypass remains available but is durably labelled unverified/audit-skipped. | 005, 011 |
| G8 | First measure upstream-versus-fork Qwen benefit with the bounded D6 diagnostic. Broader behavioral acceptance remains the fixed six-run matrix with real work, model summaries, and at least three real compactions per run; all six must satisfy artifact, state, and completion checks. Report every attempt. The broad gate is deferred, not waived, and further matrix execution requires a separate maintainer decision. | 013 |
| G9 | The exact packed artifact loads alone, preserves supported legacy records, and has a tested backup/rollback procedure. Package identity, supported versions, and installation instructions distinguish the fork. Live adoption is separate from isolated verification and preparation. | 012, 014 |
| G10 | Draft questions, questionnaires, proposal/refinement, cancellation, auditor choice, and tweak confirmation survive compaction/reopen appropriately. Cancelled proposals preserve approved goal/focus/scope; explicit draft cancellation persists a tombstone so it cannot return on reopen. Stale confirmation cannot modify a changed goal. | 005 |
| G11 | Usage is attributed once to the goal that incurred it across custom starts, retries, aborts, compaction, and focus changes. Budget exhaustion produces one durable limited transition and at most one wrap-up; resuming without increasing/removing an exhausted budget cannot restart work. | 008 |
| G12 | Immediate agent pause remains distinct from blocked. Three-consecutive-blocker guidance, optional Oracle consultation/follow-up, stall steering, and configured network recovery survive the context change without new automatic authority. | 009, 010 |
| G13 | Existing command/tool profiles, layered settings, UI/keybindings, refresh, health checks, and confirmed recovery remain usable through the packed extension. Disabled features do not erase existing records or requirements. | 006, 012 |

For G4 the bound includes all extension-injected system/message goal text,
including lifecycle warnings and audit/Oracle excerpts. Explicit user-requested
tool results and static tool schemas are measured separately by existing payload
checks; this is not a bound on the entire conversation or model tokenizer.

For G7, free-text objectives/contracts remain the requirements model.
An optional, uncontracted planning task may still be skipped with a reason.
A nonempty evidence claim is a structural prerequisite, not independent proof.
Auditor opt-out is not a scope waiver and never earns an audited/verified label.

## Implementation decisions

- Reuse the existing mutation service, project goal files, ledger, commands,
  dialogs, and auditor; do not add a database or generalized requirements engine.
- Move dynamic goal text to the per-response seam and repair custom-start
  ownership/validation. Retain tiny checkpoints and native Pi compaction.
- Preserve a current approved scope and retained task contracts in the
  authoritative goal record. Human-confirmed scope changes and latest review
  outcomes must not depend solely on best-effort ledger appends.
- Extend existing task tools with explicit incremental semantics and a
  content-based work revision that accounting alone does not invalidate.
- Preserve settings and bypass authority. Headless auto-confirmation of task
  structure does not authorize scope removal.
- Apply [ADR 0002](docs/adr/0002-goal-and-session-ownership.md) for session ownership
  and [ADR 0003](docs/adr/0003-per-response-goal-context.md) for context.
- Support exactly the tested Pi 0.85.1 line initially. Broader compatibility
  needs evidence; preserve upstream attribution and legacy reads.

## Testing decisions

The concrete S1–S3 seams, contracts, fixture, and gates are in [plan.md](plan.md).
Test through real Pi sessions and public commands/tools; inspect actual outbound
requests. Deterministic adapters control model output for lifecycle tests.
Use real local models for behavioral acceptance. Existing regression suites
supply preservation coverage; extend them only where the changed behavior needs it.

The earlier 200-node probe seeded storage and scripted summaries. It proves
feasibility, not G3 or G8. Completing the experiment with failures does not mean
behavioral acceptance passed.

The maintainer's 2026-09-08 cost review supersedes automatic matrix execution.
Ticket 013 first answers whether the fork helps in one controlled post-compaction
scenario, with a maximum of four short Qwen responses and a full-input budget.
A recorded lossy summary makes this a diagnostic, not proof of model-generated
compaction quality or general reliability. A tie, regression, or invalid probe
ends this round without more model calls. Ticket 014 records the resulting
adoption decision; neither a positive diagnostic nor completing that decision
record satisfies G8's broader gate or authorizes live installation.

## Out of scope

SDLC commands, plan-template generation, a general project manager, new
dashboard features, autonomous multi-agent scheduling, exactly-once external
side effects across independent sessions, a custom compactor/database, cloud
fallback, and publishing under upstream's npm name. Existing delegated-child
isolation remains in scope. Installation does not follow from a passing test.
