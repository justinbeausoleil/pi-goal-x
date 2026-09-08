# Specification: compaction-safe, large-task goals

Status: draft for review; no implementation acceptance criterion is complete.
Source: [intent](intent.md). Vocabulary: [CONTEXT.md](CONTEXT.md).
Evidence: [triage](docs/research/goal-reliability.md).

## Problem statement

A user can start or continue a goal without the model receiving its objective
or current task. Compaction preserves stored progress but can remove the
conversation details needed to continue. Large plans also exceed the public
task tool's 50-node limit. These are verified integration/contract failures,
not a demonstrated Qwen-specific defect.

## Solution

Make each model response receive a bounded, current view of its focused goal.
Keep the full goal and task requirements authoritative outside conversation
summaries. Support at least 200 task nodes through public, incremental
operations and lossless paged reads. Preserve goal controls and require
workspace evidence before global completion.

The package manages goals. The intent, spec, tickets, and ADRs describe how we
develop it; no SDLC behavior is added to the package.

## User stories

1. As a user, I can draft and confirm a goal so the first autonomous response
   knows the objective I approved.
2. As a user, I can create a goal directly and have it start with the same
   reliable context as a guided goal.
3. As a user, I can decompose work into at least 200 tasks/subtasks and extend
   the plan without replacing unrelated progress.
4. As a user, I can compact repeatedly and continue the current task with the
   correct requirements while completed work stays completed.
5. As a user, I can use ordered goals and hierarchy without weakening their
   existing ordering and parent-completion semantics.
6. As a user, I can retrieve any omitted objective, task, or evidence exactly.
7. As a user, I can pause, resume, clear, or change focus without a stale
   continuation doing more work for an earlier goal.
8. As a user, I can reopen a session and recover durable work; moving backward
   in conversation history does not silently undo project progress.
9. As a user, I can trust that a changed plan does not silently erase original
   requirements or unresolved completion-audit findings.
10. As a user of either configured local Qwen model, I can see measured
    end-to-end results and limitations before adopting the fork.

## Acceptance criteria

| ID | Observable behavior | Delivery ticket |
| --- | --- | --- |
| G1 | Pi 0.85.1 loads the fork; guided/direct creation and every autonomous checkpoint deliver the exact focused objective or an explicit lossless retrieval reference before work. Unfocused/stale checkpoints cannot act as active goals. | [001](docs/tickets/001-reliable-start.md) |
| G2 | Each next model request after task changes, manual compaction, threshold compaction, or overflow recovery reflects the current task/status/contracts. Three successive compactions cannot erase required work or repeat completed task transitions. | [002](docs/tickets/002-compaction-continuity.md) |
| G3 | Public tools create and extend at least 200 total nodes, preserve stable IDs and untouched status/evidence, and reject duplicate IDs, invalid parents, cycles, excessive depth, and stale revisions without partial writes. Ordered mode remains ordered. | [003](docs/tickets/003-large-task-plans.md) |
| G4 | Goal-added context is bounded to 10,000 characters per model request for the supported fixtures, independent of total plan size. Omitted content is explicitly marked and available through lossless revision-aware pages. Projections never accumulate in persisted chat. | [002](docs/tickets/002-compaction-continuity.md), [003](docs/tickets/003-large-task-plans.md) |
| G5 | Pause, abort, clear, focus change, pending user steering, and failed compaction stop or supersede autonomous work correctly. A successful overflow retry does not also spawn a duplicate continuation. | [004](docs/tickets/004-session-and-stop-controls.md) |
| G6 | Reload, process reopen, new session, fork, and backward tree navigation obey the documented project-goal/session-focus ownership policy. Corrupt records and conflicting mutations fail visibly without replacing valid progress. | [004](docs/tickets/004-session-and-stop-controls.md) |
| G7 | Completion is rejected while a required task/requirement is unresolved or lacks its required evidence. Plan deletion/skipping alone cannot waive original requirements. Audit rejection/error remains durable; only verified satisfaction or an explicit user-approved scope revision can discharge a requirement. | [005](docs/tickets/005-completion-integrity.md) |
| G8 | Both local Qwen models complete representative multi-stage fixtures with real model-generated summaries and at least three compactions. Record all attempts, thinking settings, artifact checks, tokens, retries, and failures. | [006](docs/tickets/006-qwen-validation.md) |
| G9 | A package trial preserves existing goal data, user package choices, settings, and credentials, and has a tested rollback. The fork is distinguishable from upstream; both cannot register conflicting goal commands in the same trial. | [007](docs/tickets/007-package-trial.md) |

## Implementation decisions

- Reuse the existing mutation module, durable project goal records, ledger,
  public commands, UI, and auditor. Retain one coherent mutation interface.
- Deliver dynamic goal context at the per-response seam and remove obsolete
  dynamic system state. Repair custom-start ownership setup as well as text
  delivery; a sender swap or an extra reminder alone is insufficient.
- Keep native Pi compaction. A summary is conversation context, never authority
  for goal progress or completion.
- Extend existing task operations with explicit incremental mutations and
  revision checks; preserve existing replacement semantics only where user
  confirmation explicitly requests structural replacement.
- Use the ownership policy in [ADR 0002](docs/adr/0002-goal-and-session-ownership.md).
  Do not introduce autonomous multi-agent scheduling.
- Pin the supported Pi line during implementation rather than widening a peer
  range without validation. Keep upstream attribution and storage compatibility.

## Testing decisions

Proposed seams S1–S3 are defined in [plan.md](plan.md) for user review before
new tests are written. Test observable behavior at the actual Pi session and
public goal-tool interfaces, with final model requests as the observation
point. Replace provider work with deterministic adapters for lifecycle cases;
use real local models for behavioral acceptance.

Existing helper suites remain useful regression checks but cannot substitute
for the lifecycle seam. The earlier 200-task probe seeded storage and scripted
summaries; it is evidence for feasibility, not completion of G3 or G8.

## Out of scope

SDLC commands, plan-template generation for users, a general project manager,
new dashboard features, autonomous multi-agent orchestration, a custom
compactor/database, cloud fallback, and publishing under upstream's npm name.
Installation and publication do not follow automatically from a passing test.
