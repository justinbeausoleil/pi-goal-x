# 004: recover sessions and honor stop controls

**Status:** draft
**Blocked by:** 002: keep current work through compaction.
**Requirements:** G5, G6; seams S1 and S2.
**What to build:** A user reopens work, moves through session history, or changes goal controls without stale or duplicate autonomous work.

## Acceptance criteria

- [ ] Reopen a real persistent session and recover the focused goal's authoritative progress through public tools.
- [ ] Test reload, new session, fork, and backward tree navigation against the proposed ownership ADR; chat navigation cannot rewind project requirements.
- [ ] Pause, abort, clear, and focus switch supersede queued continuations before the next substantive tool effect.
- [ ] Pending user input takes precedence; failed compaction/provider recovery does not silently restart work or count as progress.
- [ ] Reject corrupt/conflicting updates visibly while valid goal progress survives.
- [ ] Verify stale callbacks from a disposed/replaced session cannot control the current session.

## Evidence

Pending implementation. Record the red/green commands, observed outcomes,
review findings, and remaining limitations here before marking done.
