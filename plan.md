# Plan: repair pi-goal-x goal continuity

Status: proposed; awaiting review of the spec, test seams, and ticket breakdown.
Start with [intent](intent.md), [spec](spec.md), and [ticket index](docs/tickets/README.md).

## Proposed test seams

- **S1 — actual Pi session:** load the package through Pi's real extension
  loader, invoke public commands/tools, trigger the real lifecycle, and inspect
  outbound model requests plus observable tool results. A deterministic model
  adapter may control output and summary loss. Do not manually fire a missing
  startup hook or read a private core to make the test pass.
- **S2 — persistent session/public goal tools:** create and change goals through
  public interfaces, close/reopen or fork a real session, then query those same
  interfaces. Exercise malformed/stale input and failure recovery; confirm the
  original externally visible records survive.
- **S3 — local Qwen through Pi:** real tool execution, real summaries, and
  independently checked synthetic workspace artifacts. S1/S2 prove mechanism;
  S3 measures model use of that mechanism.

These are proposed, not approved. The installed to-spec and tdd skills call for
agreement on seams before adding tests. The user requested planning before
coding. Approval of this plan permits the ordinary implementation/check loop;
it is not a recurring per-edit approval gate.

## Delivery order

| Ticket | Blocked by | Independently observable result |
| --- | --- | --- |
| [001](docs/tickets/001-reliable-start.md) | None | A newly confirmed/direct goal and a subsequent checkpoint carry their objective on Pi 0.85.1. |
| [002](docs/tickets/002-compaction-continuity.md) | 001 | The current task survives repeated manual, threshold, and overflow compaction with bounded fresh context. |
| [003](docs/tickets/003-large-task-plans.md) | 002 | Public operations build/extend 200 nodes without erasing existing work. |
| [004](docs/tickets/004-session-and-stop-controls.md) | 002 | Reload/resume/fork and stop/focus/steering controls preserve ownership and suppress stale work. |
| [005](docs/tickets/005-completion-integrity.md) | 003, 004 | Completion and scope changes cannot hide unmet requirements or audit findings. |
| [006](docs/tickets/006-qwen-validation.md) | 005 | Both real Qwen models complete multi-stage work across real compactions, with artifact evidence. |
| [007](docs/tickets/007-package-trial.md) | 006, explicit trial authorization | An isolated install/rollback path is validated and intentional dotfiles integration is ready. |

003 and 004 can be independent worktrees once 002 is complete if parallel
writers are explicitly requested. Otherwise use one writer and take the
available frontier. A ticket may be split if its first failing scenario exposes
more work than fits a fresh context; preserve its acceptance criteria and edges.

## Likely change locations

These are navigation hints from the reviewed upstream, not extra modules to
create. Trace actual callers before changing them.

| Concern | Existing locations |
| --- | --- |
| Startup, context, ownership, continuation | extensions/goal-events.ts, extensions/goal-state.ts, extensions/goal-runtime.ts |
| Bounded objective/task projection and retrieval | extensions/prompts/goal-prompts.ts, extensions/goal-detail.ts |
| Task mutations and persistence | extensions/goal-task-tools.ts, extensions/goal-service.ts, extensions/goal-record.ts, extensions/storage/ |
| Completion and audits | extensions/goal-completion.ts, extensions/goal-policy.ts, extensions/goal-auditor.ts |
| Real session tests/package support | tests/e2e/, tests/integration/, test runner manifest, package.json and package-lock.json |
| Validation/distribution | existing CI and package scripts; dotfiles only in ticket 007 |

Reuse the existing deep mutation module rather than creating another write
path. Pure formatting helpers stay pure; lifecycle wiring is checked through
the real session. Update [the architecture description](docs/architecture.md)
when implemented behavior changes.

## Proof and workflow

For each slice: agree the seam, demonstrate its red case, implement the minimum
repair, run the targeted green check, and record the command/result in the
ticket. Preserve the known bug as a regression through the public interface.

Before integration, run the applicable existing commands from package.json:
type check, lint, full test suite, test-manifest self-check, context/provider
checks when payloads change, and package dry run. Use npm ci with lifecycle
scripts disabled for local dependency setup. Record baseline failures separately.
Existing package CI remains authoritative for its own gates.

Review the fixed-base diff against both repository guidance and the spec.
Record findings and their resolution. Update spec/plan and the relevant ADR
before coding a material scope/design change; update the ticket and milestone
record with verification and limitations.

For S3 use synthetic inputs, the configured 65,536-token context, and both
local models with off and low thinking across at least three trials each.
Each trial must have at least three real compactions and independently
verifiable output. Publish aggregate outcomes including every failure; tighten
the fixture if it only tests task recall without doing work. No cloud fallback.

## Current checkpoint

Documentation/fork preparation only. No runtime code, dependency pin, tests,
CI, package manifest, or installed Pi resources have been changed by this
planning task. [Milestones](specs/2026-09-08-goal-reliability/MILESTONES.md)
record the verified fork/commit state. Implementation approval is pending.
