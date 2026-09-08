# 005: preserve requirements through completion and plan changes

**Status:** draft
**Blocked by:** 003: large task plans; 004: session and stop controls.
**Requirements:** G7; seams S1 and S2.
**What to build:** A user receives completion only when original requirements are satisfied by evidence, even after plan revisions and repeated compaction.

## Acceptance criteria

- [ ] Reject completion with pending required leaves, missing contracted evidence, or unresolved audit findings.
- [ ] Retain the link between requirements and task evidence across edits, paging, compaction, and reopen.
- [ ] Removing/skipping a task does not silently discharge an original requirement; record explicit user-approved scope changes.
- [ ] Independent audit checks observable workspace evidence; a nonempty evidence string is not sufficient proof.
- [ ] Audit rejection, error, cancellation, and success have distinct durable outcomes and correct continuation/stop behavior.
- [ ] Verify completion/archival once and preserve upstream goal controls and explicit auditor opt-out labeling.

## Evidence

Pending implementation. Record the red/green commands, observed outcomes,
review findings, and remaining limitations here before marking done.
