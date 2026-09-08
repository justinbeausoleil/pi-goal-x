# Rebuild bounded goal context before every model response

Status: accepted by the maintainer, 2026-09-08; implementation evidence pending.

Use Pi's per-response context seam for authoritative executor goal state and
validate custom/user starts, removing obsolete dynamic system state while
keeping native compaction and tiny continuation triggers. The projection covers
every lifecycle status and applicable steering, not only objective/current task;
its exact bounds and composition are defined in [plan D1](../../plan.md#d1--start-and-per-response-context-contract).

Startup-only injection misses custom kickoff and same-run compaction on Pi
0.85.1; full checkpoints would reintroduce transcript growth. Keep projections
ephemeral, details losslessly paged, and summarizer/reviewer/child contexts
separate; none of these projections becomes stored truth.
