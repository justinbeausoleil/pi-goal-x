# Model-context accounting (PR D)

Measures the COMPLETE model-facing request — extension-injected system block,
post-hook message list, and ACTIVE tool schemas — not isolated prompt strings.

    npm run context:measure   # re-capture all fixtures -> baseline-main.json
    npm run context:gate      # deterministic equality + invariants (CI-safe)

## Layout

- `fixtures.mjs` — 24 deterministic scenarios (fixed ids/timestamps).
- `capture-context.mjs` — drives the real extension handlers over a fixture;
  returns { baseSystem, extensionSystem, messages, tools }. Pure function
  calls; no network, no child agent, no live model.
- `measure-context.mjs` — ContextSizeBreakdown + serializeRequest.
- `semantic-invariants.mjs` — SemanticOccurrenceCounts (objective, contracts,
  current task, lifecycle policy markers, checkpoint/unfocused/stale markers).
- `run-measure.mjs` / `run-gate.mjs` — the two npm scripts.
- `baseline-main.json` — committed artifact; update ONLY with a spec rationale in the active campaign.

## Notes

- estimatedTokens = chars/4 heuristic (documented estimate, not live usage).
- Schema size follows the active lifecycle profile. Extension-attributable size includes SDK guidance, injected state, goal-tool/custom results, and child requests. Conversation serialization preserves tool arguments and result metadata.
- Post-issue-#30 invariant enforced by the gate: historical checkpoint payload
  visible to the provider must be 0 chars on every fixture.

## Runtime/token optimization campaign

The 2026-09-07 capture uses actual active profiles and the SDK system-prompt builder (including tool snippets/guidelines), includes host schemas, exercises drafting/compaction, and measures child audit/Oracle request surfaces separately. Explicit get_goal results are included in the read-tool fixture. Character-based estimates remain estimates. `node experiments/context/provider-crosscheck.mjs` compares six executor/auditor/Oracle captures against real SDK provider payloads, intercepting before network dispatch.

Use `CONTEXT_OUTPUT=<file> npm run context:measure` for isolated campaign outputs. The committed main baseline is updated only after semantic gates pass. The baseline rationale is recorded in specs/2026-09-07-runtime-token-optimization/MILESTONES.md.

## Reliability fork baseline (ticket 001)

Plan D1/ADR 0003 move dynamic state from system prompts to ephemeral custom
context. The 24-fixture baseline now measures that message framing and Pi
0.85.1 SDK guidance. Goal-state bytes include the new projection, semantic
counts inspect decoded content (so multiline objectives count equally in
system and message placement), and single-objective/contract/active-marker
checks cover all automatic goal text. The gate now requires an active
projection instead of skipping assertions when the old system block is absent.
Historical checkpoints, tool schemas, and separate child requests retain their
checks. No size ceiling was raised. Full real-host compaction and aggregate
input-bound acceptance remain ticket 002, not claims of this measurement gate.

## Compaction continuity baseline (ticket 002)

Plan D1 requires stopped-state task identity/counts, persistent budget stop
instructions, and explicit retrieval markers for truncated auditor feedback.
Those deliberate payload changes update four fixture breakdowns; semantic
counts and child-request measurements remain unchanged. The gate additionally
checks the aggregate 10,000-character limit. Real-host tests separately exercise
oversized public plans and pause fields, three native compactions per path,
and Oracle/auditor child responses. No limit or semantic assertion is relaxed.
