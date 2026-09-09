# Ticket red team: lifecycle coverage and agent readiness

Date: 2026-09-08. Reviewed planning commit: f8dfb2396d1074c27689afd84a925bae1356f332.
Runtime baseline: fe430b251eeaff4ff7c041085fd05458b2776cb9, upstream 0.31.2.
Scope: red-team and repair the fork's design/tickets; no runtime implementation.
The standards and specification reviews ran independently, followed by a
source review and revision pass. Proposed contracts remain subject to the
maintainer's implementation approval.

## Standards findings and resolutions

| Finding | Resolution |
| --- | --- |
| One broad task ticket bundled mutations, paging, and scope policy; another bundled navigation, stop, provider recovery, and storage faults. | Split into 003–010, each with a public demo, bounded concern, blockers, and proof. |
| 'Incremental' and 'revision-aware' were not executable contracts. | Plan D2 defines modes, limits, omission/null/order behavior, stable progress, atomic failures, work fingerprints, and stale-page behavior. |
| Storage revisions change on accounting, potentially making every requested edit stale. | D2 separates content-based work_revision from existing storage CAS revision; a required interleaved-accounting test covers this. |
| Ownership ADR lacked exact new/reopen/fork/tree outcomes; stop wording promised more than tools can undo. | D4 gives a transition table, session-generation invalidation, child isolation, and the tool-dispatch stop boundary. |
| G7 promised only verified completion but retained auditor opt-out; waiver authority was undefined. | D3 preserves all three human-owned bypasses with explicit unverified labels; scope changes require a revision-bound human tweak confirmation and durable receipt. |
| Packaging/rollback preparation was blocked by live-install permission and scheduled after expensive model runs. | 012 tests the actual isolated artifact before 013; 014 prepares adoption without live mutation. |
| Model trials had no fixed fixture, attempt allocation, timeout, or acceptance threshold. | D6 freezes six scheduled runs, independent artifacts, compaction paths, response/time/retry limits, and a six-of-six gate. Failed experiments remain reportable. |

One first-pass documented-standard breach: the unnecessary permission dependency
violated the ticket skill's requirement for genuine blocking edges. The other
six are agent-readiness judgments, not runtime code-smell findings. All seven
have concrete document resolutions; implementation evidence is still pending.

## Specification findings and resolutions

| Finding | Resolution |
| --- | --- |
| Budget wrap-up, accounting, blocker/Oracle/stall context, and network policy omitted from the changed startup seam. | G2/G11/G12; 002 and 008–010; preserve actual default retry and prompt-policy semantics. |
| Only the confirmed start of guided drafting was covered. | G10 and 005 cover clarify/refine/cancel/rehydrate/tweak, headless behavior, settings, and full proposal inspection. |
| Completion integrity conflicted with bypasses and implied a new requirements engine. | G7 and D3 retain free-text contracts and bypasses, distinguish structural evidence from semantic review, and persist retained scope/latest review. |
| Delegated, auditor, and Oracle session isolation was absent. | G6, D1/D4, 006/009/011 preserve dedicated contexts and exclude parent goal controls. |
| Status/settings/UI/refresh/recovery phases lacked owners. | G13, 004/006/012 cover existing surfaces, maintenance, confirmations, backups, and faults. |
| Completion/archival 'once' omitted failed archival and stale async decisions. | D3 outcome table and 011 require recoverable failure, no repeated completion, and focus/work-revision validation. |

All six first-pass coverage findings have explicit requirements, ticket owners,
and tests to be supplied. Coverage is a planning result, not a claim that these
tests already pass.

## Full current lifecycle coverage

Source links point to unchanged upstream implementation in this repository.
Read source/tests when older prose disagrees. 'Preserve' means characterize
existing behavior and repair regressions introduced by the fork; it does not
authorize an unrelated rewrite. The requirements and exact behavior live in
the spec/plan, not in this inventory.

| Phase / concern | Primary baseline source | Required evidence / disposition | Owner; spec |
| --- | --- | --- | --- |
| Load, SDK, registration | [installer](../../extensions/goal.ts), [tool profiles](../../extensions/goal-tool-names.ts) | Real Pi loader/start, all 16 commands and 5 execution/3 drafting tools; align supported SDK. Repair/qualify. Original review counted17;012 source inspection confirms the same16 registrations in both fe430b2 and the fork. | 001, 012; G1, G9, G13 |
| Guided regular/ordered drafting | [draft runtime](../../extensions/goal-drafting.ts), [questionnaire](../../extensions/goal-questionnaire.ts) | Questions/refinement/confirm/cancel, durable draft, no-UI behavior, no synthetic question gate; retain minimal reconnaissance. Preserve. | 005; G10 |
| Direct regular/ordered creation | [commands](../../extensions/goal-commands.ts), [core tools](../../extensions/goal-core-tools.ts) | All starts and public explicit creation receive objective before first work. Repair. | 001; G1 |
| Tweak and structural confirmation | [draft runtime](../../extensions/goal-drafting.ts), [task confirmation](../../extensions/goal-task-confirmation.ts) | Full before/after inspection, scope receipt, cancellation, no stale commit; auto-confirm cannot waive scope. Extend. | 005; G7, G10 |
| Task decomposition/progress/hierarchy | [task tools](../../extensions/goal-task-tools.ts), [policy](../../extensions/goal-policy.ts) | Public 180+20, selected updates, ordered batches, normal/lightweight parents, stable IDs/evidence, atomic rejection. Extend/preserve. | 003; G3 |
| Detail retrieval and large views | [detail pages](../../extensions/goal-detail.ts), [task index](../../extensions/goal-task-index.ts) | Lossless Unicode/long-field pages and complete 200-node UI review; bounded defaults. Extend. | 004; G4 |
| Execution, continuation, empty turns | [runtime](../../extensions/goal-runtime.ts), [events](../../extensions/goal-events.ts) | Actual custom/normal starts, one continuation, soft nudges, existing empty-turn protection. Repair/preserve. | 001, 002, 010; G1, G2, G5 |
| Compaction and deterministic recovery | [events](../../extensions/goal-events.ts), [compaction helpers](../../extensions/goal-compaction.ts) | Manual/threshold/overflow three times; durable state projected without lossy-summary authority or transcript growth. Repair. | 002, 004; G2, G4 |
| User pause, agent pause, stop, steering | [commands](../../extensions/goal-commands.ts), [events](../../extensions/goal-events.ts), [widget controls](../../extensions/goal-widget.ts) | No new stale goal work dispatch; preserve ordinary user work, modal Esc, clear cancellation. Repair/preserve. | 007; G5 |
| Multi-goal focus / session boundaries | [pool](../../extensions/goal-pool.ts), [state](../../extensions/goal-state.ts) | Explicit null, setting-controlled sole focus, reopen/fork/tree table, no historical rewind. Clarify/repair. | 006; G6 |
| Accounting / budget stop / wrap-up | [accounting](../../extensions/goal-accounting.ts), [state](../../extensions/goal-state.ts) | Origin attribution, no double charge, one limited event/wrap-up, exhausted resume denied. Preserve/repair. | 008; G11 |
| Blocked / Oracle / stall | [blocked tool](../../extensions/goal-core-tools.ts), [Oracle](../../extensions/goal-oracle.ts), [state](../../extensions/goal-state.ts) | Prompt recurrence policy, durable advice/follow-up, bounded test failures, no false progress, read-only consultation. Preserve. | 009; G12 |
| Provider/network/overflow failures | [runtime](../../extensions/goal-runtime.ts), [backoff](../../extensions/network-error-backoff.ts) | Host settles first, preserve configured unbounded/finite policy, cancellation, no duplicate recovery. Preserve/repair. | 010; G5, G12 |
| Evidence / independent completion audit | [completion](../../extensions/goal-completion.ts), [auditor](../../extensions/goal-auditor.ts) | Actual artifact review, every verdict/error/cancel/bypass, retained requirements/latest findings after reopen. Extend/preserve. | 005, 011; G7 |
| Deferred completion / archive / clear | [events](../../extensions/goal-events.ts), [storage](../../extensions/storage/goal-files.ts) | Result delivered before archive, confirmed clear, recoverable failed archive, no duplicate completion. Preserve. | 007, 011; G5, G6, G7 |
| Durability / concurrency / legacy / repair | [service](../../extensions/goal-service.ts), [storage](../../extensions/storage/goal-files.ts), [recovery tests](../../tests/goal-recovery.test.ts) | Atomic CAS, visible ledger warnings, corrupt/unsafe files, branch-local focus, legacy reads, diagnosis/backup/confirmed repair. Preserve/extend. | 003, 006, 012; G3, G6, G9 |
| Settings / status / dashboard / keybindings | [settings](../../extensions/goal-settings.ts), [commands](../../extensions/goal-commands.ts), [widget](../../extensions/goal-widget.ts) | Layer precedence/override removal/validation/refresh, lifecycle profiles, task/contract toggles, audit choice and complete views. Preserve. | 004, 012; G13 |
| Delegated / reviewer isolation | [session safety](../../extensions/goal-session-safety.ts), [installer](../../extensions/goal.ts) | No parent tools/auto-projection; retain auditor/Oracle dedicated context and tool policies. Preserve. | 006, 009, 011; G6 |
| Build / experiments / release / rollback | [package](../../package.json), [CI](../../.github/workflows/ci.yml), [test runner](../../scripts/run-unit-tests.mjs) | Declared runtime matrix, real packed loader, all relevant gates, fixed Qwen results, restored pretrial copies, intentional adoption. Qualify. | 012–014; G8, G9, G13 |

## Original numbered phases

The historical [Agentic Runtime PRD](../agentic-runtime-prd.md) is a design
record, not a second current spec. In particular, its older command names,
ban on normal create_goal, absence of budgets, ledger-owned focus, and mandatory
auditor assumptions conflict with subsequently shipped code. We preserve the
current equivalents and explicitly map the original work instead of reviving
removed APIs or silently treating planned historical work as complete.

| Original PRD rollout milestone | Migration stage / concern | Fork coverage |
| --- | --- | --- |
| 1 — PRD/design freeze | Hard invariants versus soft guidance | Current intent/spec/plan/ADRs/tickets; approval remains pending. |
| 2 — shadow ledger | A — lifecycle history, non-corrupting failures | Existing service/ledger preserved; 006/011 fault and durability checks. |
| 3 — deterministic summary | B — state independent of LLM summary | 002/004 deliver authoritative per-response projection and bounded retrieval. |
| 4 — auditor feedback loop | D — latest result and reconstruction | 005/006/011 preserve scope/findings/reopen; current focus remains session-local. |
| 5 — soft gate relaxation | C — questions/reconnaissance/get_goal nudges | 005/009/010 preserve guidance and hard confirmation/stop boundaries. |
| 6 — experiment realignment | Outcome-based evaluation | 001 real-host reproduction, 012 package/runner checks, 013 real artifacts. |
| 7 — runtime simplification | E — obsolete gates/prompt duplication | 001/002 reuse existing modules, remove stale dynamic system state; 012 regression/docs gate. |

The later [runtime follow-up plan](../../specs/2026-08-04-goal-runtime-follow-up/TECH.md)
also numbered stages. Its source-based coverage is:

| Follow-up stage | Fork owner |
| --- | --- |
| 1 settings correctness | 012 |
| 2 confirmation and audit UX | 004, 005, 007, 011 |
| 3 completion transaction hardening | 011 |
| 4 cross-process mutation control | 003, 006 |
| 5 drafting restoration; 5.1 A–D durable draft, status/auditor, capability parity, proof | 001, 005, 007, 011, 012 |
| 6 experiment harness hardening | 012 existing harness regression; 013 bounded frozen real-model experiment |
| 7 test runner and coverage / SDK alignment | 001, 012 |
| 8 documentation and release | 012, 014 |

No historical stage is silently omitted or represented as newly implemented.
The ledger remains append-only, path safety remains enforced, and source
objectives/contracts/reports remain untrusted data rather than runtime/tool
authority. Preserve these boundaries in changed projections and review prompts.

## Second-pass adversarial checks

A second read found five edge cases introduced or left ambiguous by the first
revision. They are now resolved in the same contracts and acceptance owners:

- Draft cancellation must persist a tombstone; only approved goal/focus/scope
  and project lifecycle data are a cancellation no-op (D3; 005).
- Reusing a completed ID with a new title/contract cannot preserve completion
  evidence through upsert; the same deterministic reopening rule applies to all
  structural paths (D2/D3; 003/005).
- External prompt edits cannot silently replace retained scope. Legacy reads
  remain supported; migrated discrepancies are visible proposals requiring
  the existing confirmation path (D3; 005/006/012).
- Draft memory and dialogs are branch/session-bound; normal drafts and detached
  tweaks have explicit fork/tree outcomes (D4; 005/006/007).
- Archive recovery remains reachable after restart through confirmed recovery,
  and tweak has an explicit active/paused/blocked/budget-limited status matrix
  (D3; 005/011).

The final local check also made removed-task evidence retention explicit:
snapshot it with the retained contract and report unresolved original IDs with
a recreate-or-revise path, so removal cannot orphan either proof or obligations.

## Original draft ticket mapping

| Original draft | Current slices |
| --- | --- |
| 001 startup | 001 |
| 002 compaction | 002, 004; state-specific proof in 008–010 |
| 003 large plans | 003, 004, 005 |
| 004 sessions/stop | 006, 007, 008, 009, 010 |
| 005 completion | 005, 011 |
| 006 Qwen validation | 013 |
| 007 package trial | 012, 014 |

Draft IDs were renumbered before implementation or external issue publication.
No completed implementation or evidence was discarded.

## Validation and remaining limits

The documentation audit checks every G1–G13 mapping, every lifecycle owner,
14 unique ticket IDs, lower-numbered acyclic blockers, local link targets,
and that the changed tracked/untracked files are Markdown only. It also checks
the exact CLAUDE.md import and preservation of upstream runtime/test/manifests.
The final commands/results are recorded in the milestone log.

Agent-readiness means each ticket has a specified public behavior, relevant
decisions, entry context, a narrow demo, and falsifiable proof. It does not
predict that every implementation will fit a fixed token count. If a reproduced
failure exposes a distinct larger defect, split a bounded dependent ticket
and retain the acceptance owner before continuing; do not silently drop it.

No runtime tests were executed for this document-only review. No implementation
criterion is marked complete, and no model success rate is inferred from the
earlier recall probe. The remaining entry condition is approval of the revised
implementation design, not unanswered ticket-level product choices.
