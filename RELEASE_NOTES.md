# 0.31.2-reliability.2 — private qualification candidate

- Auditor-toggle notices and ledger entries now reflect the saved result. A
  failed durable write reports an error and leaves the prior selection intact.
- Global abort cancels pending task confirmation and completion review even
  when the goal was already paused. Late results cannot mutate that goal, and
  cancellation does not retarget a newly selected goal.

This candidate requires its own package qualification and six-run Qwen gate.
See [FORK.md](FORK.md) for the artifact-specific records.

# 0.31.2-reliability.1 — private qualification candidate

Package: `@justinbeausoleil/pi-goal-x`; derived from upstream 0.31.2 under MIT.
Pi 0.85.1 is the supported SDK line. Installed-package lifecycle checks cover
Node 22.15.0 and 24.0.0. Artifact-specific qualification and the required six-run
real-Qwen acceptance results are linked from [FORK.md](FORK.md); neither the
version number nor these change notes imply live adoption.

- Every executor response receives bounded current goal context, including
  native compaction and custom-message starts. Stale execution cannot regain
  authority after user stops, session changes or queued historical messages.
- Plans support200 nodes. `set_goal_tasks(mode="upsert")` accepts up to50 entries
  per call; `mode="replace"` preserves the legacy full-replacement meaning.
  Existing-plan structure/progress mutations require `expected_work_revision`
  from `get_goal` or a prior successful mutation. Usage alone does not change it.
- `get_goal` pages full objective, scope, task, evidence, history and review
  detail with at most4000 content characters per page. Automatic goal text is
  bounded to10000 characters. Cursors are tied to the content being read.
- Retained requirements survive plan deletion, skipping and feature toggles.
  The existing human-confirmed `/goal-tweak` flow owns scope changes. Legacy
  records remain readable and acquire retained metadata on migration.
- Review outcomes persist across compaction/reopen. Audited and audit-skipped
  completion have distinct labels. Confirmed `/goal-recovery repair` recovers
  complete records left at active paths by failed/interrupted archival.
- Usage remains attributed to its original goal through retries, stops and
  final responses after archival. Budget stops, Oracle guidance and provider
  recovery retain their existing user controls.

The16 existing slash commands and five normal/three drafting goal tools remain.
Settings, dialogs, dashboard/keybindings and delegated-child isolation are
part of qualification. The planning documents' earlier count17 was a counting
error: the original runtime baseline and this fork register the same16 names.

Trial and rollback: install the exact tarball alone into an isolated environment
as described in README.md. Preserve pretrial package/settings/data byte-for-byte
and retain fork-written data separately. Do not ask upstream to rewrite new
fields or a200-node plan as a rollback procedure. Adoption preparation must cite
the exact artifact hash, package qualification and passing real-model results.
