# Rebuild bounded goal context before every model response

Status: proposed; supported by the triage reproduction.

Use Pi's per-response context seam to project authoritative goal state, while
removing obsolete dynamic system state and validating actual custom/user
starts. Keep native compaction and tiny continuation triggers. This makes task
continuity independent of whether a lossy summary remembers the current task.

Startup-only injection misses custom kickoff and same-run compaction on Pi
0.85.1. Restoring full checkpoints would reintroduce transcript growth. Full
objective/task details remain available through bounded, revision-aware
retrieval; the projection is ephemeral and cannot itself become stored truth.
