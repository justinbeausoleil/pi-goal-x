# Development tickets: goal reliability

These tickets repair the goal-management package. They are not tasks the
package generates for its users.

All implementation tickets are draft until the spec, plan, and test seams
receive review. The owner is the maintainer. Work the dependency frontier;
record an assignee when starting a ticket.

| ID | Outcome | Blocked by | Status | Spec |
| --- | --- | --- | --- | --- |
| [001](001-reliable-start.md) | Reliable goal startup and checkpoints | None | draft | G1 |
| [002](002-compaction-continuity.md) | Task continuity through compaction | 001 | draft | G2, G4 |
| [003](003-large-task-plans.md) | Incremental 200-node public task plans | 002 | draft | G3, G4 |
| [004](004-session-and-stop-controls.md) | Session recovery and safe stop controls | 002 | draft | G5, G6 |
| [005](005-completion-integrity.md) | Requirement/evidence completion integrity | 003, 004 | draft | G7 |
| [006](006-qwen-validation.md) | Both Qwen models complete real fixtures | 005 | draft | G8 |
| [007](007-package-trial.md) | Isolated package trial and rollback | 006, trial authorization | draft | G9 |

Before marking done, replace the ticket's evidence-pending line with commands,
results, artifact locators, and limitations; record review findings. Use the
[tracker policy](../agents/issue-tracker.md). The
[milestone log](../../specs/2026-09-08-goal-reliability/MILESTONES.md)
records setup, decisions, setbacks, and integration.
