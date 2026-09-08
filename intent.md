# Intent: reliable persistent goals

Status: requested; implementation design is awaiting review.
Owner: Justin Beausoleil. Created: 2026-09-08.

## Problem

The user wants pi-goal-x to keep working toward an original goal through large
task decompositions and conversation compaction with the local Qwen models.
The investigation reproduced missing goal context during automatic startup,
stale current-task context after threshold and overflow compaction, and a
50-node public task limit on Pi 0.85.1.

## Proposed outcome

Maintain a focused fork of pi-goal-x that preserves its goal creation,
continuation, task tracking, budgets, blocker recovery, maintenance, controls,
and completion audit while correcting
those failures. Users should resume meaningful work from durable goal state,
without repeating completed tasks, losing pending requirements, or claiming
completion early.

## Affected users and systems

The first user is the maintainer running Pi 0.85.1 with local Qwen3.6-35B-A3B
and Qwen3.8-27B models. The fork is a normal Pi goal-management package.
The current package, existing goal records, session focus, and local model
configuration form the compatibility baseline.

## Constraints

- Follow SDLC to develop this fork. SDLC documents and development tickets are
  repository maintenance records; they are not runtime goal features.
- Preserve upstream history, MIT attribution, useful public behavior, and
  existing project goal data.
- Keep source in one repository under ~/Developer/tools/pi-goal-x. Dotfiles
  owns eventual machine configuration; Pi owns private runtime state.
- Plan and document before coding. Keep implementation and test-seam choices
  reviewable; record approval without inventing it.
- Prove large-task behavior through public tools and the real Pi lifecycle.
  A good summary or an internal helper test alone does not prove recovery.
- Keep changes focused: reuse storage and native Pi compaction; avoid a new
  database, model server, SDLC command, or general orchestration framework.
- Fork creation and documentation are authorized. Changing the live Pi package
  selection, npm publication, and upstream contributions are separate actions.

## Open design review

The concrete proposal is in [spec.md](spec.md), the delivery order and test
seams in [plan.md](plan.md), and decisions in [docs/adr](docs/adr).
The proposed capacity is 200 total task nodes. The red-team review maps every
current lifecycle phase and original numbered development stage to a ticket.
The proposed candidate identity and isolated distribution route are specified
in plan D6; publication and live package selection remain separate actions.
