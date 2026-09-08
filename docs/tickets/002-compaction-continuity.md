# 002: keep current work through compaction

**Status:** draft
**Blocked by:** 001: reliably start and continue a goal.
**Requirements:** G2, G4; seam S1.
**What to build:** A user progresses through tasks and compacts repeatedly; the next response continues the correct current task from durable requirements.

## Acceptance criteria

- [ ] Demonstrate a red case where an off-window current task disappears after summary loss even though durable state remains.
- [ ] Repair manual, threshold, and overflow paths, including compaction between tool responses inside one agent run.
- [ ] Observe current task, completion status, and contract/retrieval references after each of three successive compactions.
- [ ] Remove stale dynamic system state; adding a competing reminder is insufficient.
- [ ] Keep the full added goal projection bounded and absent from persisted chat; retain lossless access to omitted details.
- [ ] Preserve assistant/tool-result pairing and avoid an extra goal continuation after host overflow recovery.

## Evidence

Pending implementation. Record the red/green commands, observed outcomes,
review findings, and remaining limitations here before marking done.
