# Working on the goal-reliability fork

This package manages persistent goals. SDLC is our development process; add
product behavior only for the goal-reliability requirements in spec.md.

Before changing code, read intent.md, spec.md, plan.md, the selected ticket in
docs/tickets/, and applicable ADRs. The maintainer approved the specification, D1–D6 contracts, S1–S3 seams,
14 tickets, and ADRs 0002–0004 on 2026-09-08; see the milestone log. Execute
the ticket frontier and record evidence before marking acceptance complete.

Inspect git status and preserve unrelated work. Use upstream as the read-only
integration remote and origin as the maintainer's fork. Use separate worktrees
for simultaneous writers; routine single-writer work needs no extra worktree.

For bug fixes, trace all callers and keep a runnable reproduction at the
public seam. Reuse the existing mutation path and Pi lifecycle. Per ticket,
record what changed, checks/results, and remaining limitations before done.
Before integration, follow plan.md's checks and review against both spec and
standards. Runtime state, private traces, and credentials stay outside Git.

## Agent skills

For spec/ticket work, use the installed to-spec and to-tickets skills with
[our local tracker](docs/agents/issue-tracker.md). Its repository-local path
overrides the skills' default scratch location.

For terminology or ADR changes, use domain-modeling and read
[domain guidance](docs/agents/domain.md). CONTEXT.md is a glossary only.

For module/test-seam changes, use codebase-design; for a bug, diagnosing-bugs;
for approved test-first implementation, tdd. For a fixed-base review, use
code-review with spec.md and the relevant tickets as its specification.
For instruction changes, use writing-for-agents. Shared skills need compatible
tools in the active harness; their names do not grant tool access.

## Upstream feature-record convention

Preserve the existing upstream specs/ records. The original guidance below
continues to apply to those records. For this fork's goal-reliability work,
root intent.md/spec.md/plan.md and docs/tickets/ are canonical; the new dated
spec directory contains pointers and the milestone log, not duplicate specs.

Spec directories live under `specs` unless a nested AGENTS.md documents a more specific convention.
Spec directory names use `YYYY-MM-DD-kebab-feature`, for example `2026-05-13-drafting-runtime-simplification`.
Spec directories include `PRODUCT.md`, when implementation planning is useful `TECH.md`, and a free-form `MILESTONES.md` implementation log.
`MILESTONES.md` records meaningful implementation milestones, failed attempts, setbacks, fixes, validation notes, and decisions without a strict schema.
When a user steers behavior mid-workflow, update `PRODUCT.md` first when behavior changes, then `TECH.md`, then implementation, tests, and `MILESTONES.md` as needed.
