# Preserve project goal authority and session-local focus

Status: accepted by the maintainer, 2026-09-08; implementation evidence pending.

Retain project goal files as authoritative and session focus as branch-local;
conversation compaction/navigation never rewinds project requirements or
progress. Reopen reconciles current records, a new fork explicitly detaches
focus, and backward navigation requires explicit focus/resume before autonomous
work, as specified by the [plan's ownership table](../../plan.md#d4--ownership-and-stop-boundary).

This preserves cross-session data without treating inherited chat as execution
authorization. Keep existing storage revision/locking conflicts and child-session
isolation; this fork does not add a distributed execution lease or promise
exactly-once workspace effects between independently authorized sessions.
