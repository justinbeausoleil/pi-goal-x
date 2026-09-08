# 003: create and extend large plans through public tools

**Status:** draft
**Blocked by:** 002: keep current work through compaction.
**Requirements:** G3, G4; seams S1 and S2.
**What to build:** A user decomposes a goal into 200 tasks/subtasks, adds or edits a small group later, and retains unrelated progress and evidence.

## Acceptance criteria

- [ ] Create at least 200 total nodes through public operations; direct fixture writes cannot satisfy capacity acceptance.
- [ ] Add/update explicitly selected nodes without resending or replacing the whole plan; stable IDs retain status/evidence.
- [ ] Reject stale revisions, duplicate IDs, invalid parents, cycles, and depth violations atomically.
- [ ] Require explicit confirmation for structural removal/replacement; never infer a scope waiver from deleting a task.
- [ ] Retrieve every task and its complete requirements/evidence through revision-aware pages with clear stale-cursor behavior.
- [ ] Preserve ordered-goal and parent/subtask semantics and the bounded projection through repeated compaction.

## Evidence

Pending implementation. Record the red/green commands, observed outcomes,
review findings, and remaining limitations here before marking done.
