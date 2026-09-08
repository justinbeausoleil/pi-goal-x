# 001: reliably start and continue a goal

**Status:** draft
**Blocked by:** None (first implementation slice after plan review).
**Requirements:** G1; seam S1.
**What to build:** A user confirms a guided goal or creates one directly; the initial autonomous response and a later checkpoint know the correct objective and focus.

## Acceptance criteria

- [ ] Port the missing-objective reproduction to the real Pi session seam and record its failure against the untouched upstream baseline.
- [ ] Validate the fork on Pi 0.85.1 with aligned development dependencies; record inherited failures separately.
- [ ] Guided confirmation, direct creation, and a second automatic checkpoint deliver current goal identity/objective or exact retrieval references before work.
- [ ] Unfocused, replaced, paused, and malformed checkpoints cannot initiate substantive goal work.
- [ ] Exercise the actual custom-message path; helper-only or manually invoked startup hooks cannot satisfy this ticket.

## Evidence

Pending implementation. Record the red/green commands, observed outcomes,
review findings, and remaining limitations here before marking done.
