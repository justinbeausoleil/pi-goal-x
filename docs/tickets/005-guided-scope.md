# 005: confirm drafts and revise scope without losing requirements

**Status:** done — verified by Codex 2026-09-08 at dc4d94e.
**Blocked by:** 004.
**Requirements:** G7, G10; seams S1, S2.
**What to build:** A user refines, cancels, confirms, or tweaks a goal with complete visibility of retained requirements.

## Agent handoff

Read [spec](../../spec.md), [plan](../../plan.md) sections D2, D3, D4, the
[glossary](../../CONTEXT.md), applicable ADRs, and blocker evidence.
Use the plan's navigation/test table; trace the selected public flow before edits.

**Boundary:** Guided lifecycle plus scope-preserving edits. Completion judgment belongs to 011; no generalized requirement-ID engine or new approval service.

## Acceptance criteria

- [x] Exercise question, questionnaire, proposal, continue-chatting, confirm, cancel, draft replacement/resume, and per-draft auditor choice for both modes. Preserve direct-to-proposal for fully specified goals and minimal read-only reconnaissance; no unconfirmed draft starts autonomous goal work.
- [x] Compact/reopen drafts and switch between two branches with different live drafts and cancellation tombstones. Restore only the selected branch's draft; a fork can inherit a normal discussion draft but invalidates a detached tweak. Bind dialogs to branch/session generation and goal/work revision.
- [x] Persist D3 retained scope, removed-task evidence snapshots, and receipts through the mutation service, with migration from existing objectives/contracts on first successful write. Add scope detail paging under D2; unresolved removed tasks retain their ID and a recreate-or-revise resolution path.
- [x] Confirm a 200-node tweak with complete before/after requirements reachable. A tweak without replacement preserves tasks; unaffected IDs preserve progress. Apply D2's title/contract-change reopening and evidence invalidation across upsert, replacement, and tweak.
- [x] Demonstrate that deleting/skipping a contracted task, structural auto-confirmation, model-supplied approval, or disabling tasks/contracts cannot waive scope. Only the bound human /goal-tweak confirmation can revise retained obligations.
- [x] Preserve optional uncontracted tasks, block_completion, lightweight parent behavior, and task-disabled drafting. Question/proposal cancellation keeps the draft; /goal-cancel persists a tombstone without changing approved goal/focus/scope or project lifecycle events. Independently incurred usage/transcript is allowed; ledger failure cannot erase an accepted scope receipt.
- [x] Detect external objective/contract changes on migrated goals as pending proposals, retain execution/audit scope, stop autonomous work, and require human confirmation. Keep legacy pre-migration and budget-only refresh behavior explicit.
- [x] Confirmed tweak preserves active, resumes paused/blocked once with pause metadata cleared, and leaves exhausted budget_limited stopped. Refinement/cancellation never resumes work.

## Proof and completion

Cancel a proposed requirement removal and verify it remains; confirm the exact revision through the existing UI and verify its receipt after reopen.
Run the inherited S1/S2/S3 command applicable above, targeted prior regression
suites, and the plan's required checks. Record baseline/red (or preservation
characterization), green commands/results, artifact locators, review findings,
and limitations. Acceptance checkboxes require evidence.

Evidence: [independent review and acceptance mapping](../reviews/2026-09-08-ticket-005.md),
`~/Data/pi-goal-x/reliability/005/review-checks.json`, and the
[milestone log](../../specs/2026-09-08-goal-reliability/MILESTONES.md).
Final qualification: 1083/1083 tests, type/lint, runner self-check, context28/
provider7, applicable benchmark gate, ranking checks, dry pack and production
audit. Both independent axes cleared the implementation. General budget and
review-outcome/packaged-model acceptance retain owners 008 and 011–014.
