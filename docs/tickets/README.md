# Development tickets: goal reliability

These are development tickets for the goal package, not tasks it generates.
Status: implementation approved 2026-09-08. Tickets 001–012 are verified for the replacement candidate; 013 is in progress.
Read the [spec](../../spec.md), [plan contracts](../../plan.md), and
[source-backed lifecycle review](../reviews/2026-09-08-ticket-red-team.md).

| ID | Observable outcome | Blocked by | Status | Spec |
| --- | --- | --- | --- | --- |
| [001](001-reliable-start.md) | reliably start and continue a goal | None | done | G1 |
| [002](002-compaction-continuity.md) | preserve every lifecycle state through compaction | 001 | done | G2, G4 |
| [003](003-large-task-plans.md) | incrementally build a 200-node task plan | 002 | done | G3 |
| [004](004-large-plan-details.md) | inspect and continue large plans losslessly | 003 | done | G2, G4 |
| [005](005-guided-scope.md) | confirm drafts and revise scope without losing requirements | 004 | done | G7, G10 |
| [006](006-session-recovery.md) | recover sessions without inherited autonomous authority | 002 | done | G6, G13 |
| [007](007-stop-controls.md) | stop queued goal work and prioritize user steering | 006 | done | G5 |
| [008](008-budget-accounting.md) | exhaust a budget once and preserve accurate usage | 007 | done | G2, G11 |
| [009](009-blocker-oracle.md) | retain blocker and Oracle recovery through compaction | 007 | done | G2, G12 |
| [010](010-provider-recovery.md) | coordinate provider recovery with Pi and user stops | 007 | done | G5, G12 |
| [011](011-completion-integrity.md) | persist trustworthy completion outcomes and archive safely | 005, 007, 008, 009 | done | G6, G7 |
| [012](012-package-compatibility.md) | qualify the packed fork and rollback across existing surfaces | 004, 005, 006, 008, 009, 010, 011 | done | G9, G13 |
| [013](013-qwen-validation.md) | execute the fixed real-Qwen acceptance matrix | 012 | in-progress | G8 |
| [014](014-adoption-plan.md) | prepare the verified fork for an intentional live trial | 013 (behavioral acceptance PASS required) | ready-for-agent | G9 |

The current frontier is **013**: matrix03 is frozen and running against the
qualified reliability.2 candidate (Codex, single implementation writer).
Matrix02 finished0/6 and remains retained; it does not qualify the repaired candidate.
The completed bounded child [012a](012a-harness-sdk.md) repaired the existing
experiment launcher; the original 14-ticket scope is unchanged.
Later tickets follow only their
listed blockers. Use one writer unless parallel work is explicitly requested.
Blockers are numbered before dependents; approval is a shared entry condition,
not a repeated gate inside every slice.

012 qualifies the packed candidate before 013 spends real model time.
A completed 013 experiment with failed cases blocks 014; completion of the
experiment and passing behavioral acceptance are separate facts.
014 prepares a live trial but does not execute it. No ticket needs live-install
authorization to run isolated tests or prepare a concrete configuration diff.

Each ticket includes its entry documents, precise contract references,
end-to-end demo, exclusions, and acceptance evidence. Assignee: maintainer
until delegated; record the executor when work starts. Before marking done,
fill evidence and review findings under the [tracker policy](../agents/issue-tracker.md).

The original seven drafts were split and renumbered before implementation.
Their [mapping and review resolutions](../reviews/2026-09-08-ticket-red-team.md)
preserve provenance; historical milestone counts describe the earlier packet.
