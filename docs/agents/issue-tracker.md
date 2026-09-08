# Issue tracker

Use version-controlled Markdown tickets in docs/tickets/, one numbered file
per ticket. This is the user's requested repository directory convention;
it replaces the generic skills' .scratch/<feature>/issues path.

The canonical requirements are root spec.md. The ticket index records the
frontier, status, blocking edges, and requirement mapping. Number blockers
before dependents. Ticket bodies state end-to-end behavior and acceptance
criteria; change-location details belong in plan.md.

Statuses: draft, ready-for-agent, in-progress, ready-for-human, done, blocked.
Optional triage dispositions: needs-triage, needs-info, wontfix.
Draft means proposed, not authorized implementation. Move a draft to
ready-for-agent only after the plan/seam/ticket review is recorded; actual
execution also requires its blockers to be done. Done requires evidence,
not just checked boxes. A blocked ticket names the unresolved condition.

GitHub is the Git host for this fork. Do not mirror these tickets into GitHub
Issues or notify upstream maintainers unless requested. PRs are not a task
intake surface. Update this file if the user changes the tracker.
