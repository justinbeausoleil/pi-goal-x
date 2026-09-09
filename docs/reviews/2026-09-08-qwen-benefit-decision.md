# Bounded Qwen benefit diagnostic and adoption decision

**Result: INCONCLUSIVE_PREFLIGHT. Decision: no-go; stop further model spending.**
The comparison made **zero Qwen generation requests and used zero Qwen tokens**.
The offline token counter could not verify the complete prompt budget, so the
predeclared stop rule prevented dispatch. This does not measure Qwen behavior
or show that the fork is worse. Comparative benefit remains unproven.

## What was attempted

The fixture selected `label` as the current task, left an earlier pending task
unselected, and preserved a completed `receipt.txt`. Its pending contract was
to write `shipping-label.txt` as exactly `ACCOUNT=007` plus a newline. Independent
checks would score actual next-task work, the leading-zero requirement and
absence of repeated writes to the completed receipt.

Both versions reached equivalent state through public goal tools and one native
manual compaction using the same recorded lossy summary. Pi retained read/write
and all five normal goal tools. Native system guidance was retained. The next
outbound payload reached the offline preflight, before the provider's HTTP call.
No actual Qwen work checks ran; do not interpret absent output as model failure.

| Offline attempt | Result | Qwen requests |
| --- | --- | --- |
| 01–02 | Setup assertion ran before the asynchronous command continuation settled; preparation was corrected | 0 |
| 03 | Native Pi automatically enabled the remaining goal tools; expected tool inventory corrected | 0 |
| 04 | Native setup/compaction succeeded for both; complete-input tokenizer preflight failed | 0 |

The installed MLX `load_processor` path attempts to construct a
`Qwen3VLVideoProcessor`, which requires unavailable PyTorch/Torchvision packages.
No dependencies were installed and no alternate counting approximation was used.
The request never passed the input guard. The intended limits remain four
responses total, 4,096 input and 256 output tokens per request, 17,408 combined
and five minutes; they were not increased. These limits exclude Codex's work
preparing and documenting the experiment.

## Evidence and reproducibility

- Attempt records: `~/Data/pi-goal-x/reliability/013/benefit-preflight-01/`
  through `benefit-preflight-04/`.
- Compact outcome: `~/Data/pi-goal-x/reliability/013/benefit-decision.json`.
- Attempt04 contains the frozen fixture/source hashes, public setup, native
  compaction events, provider preflight errors, per-version results and exact
  `benefit-probe.mjs` / `count-qwen-input.py` prototype snapshots. The unused live
  branch is unqualified; these snapshots are evidence, not an approved runner.
  No prototype implementation was added to the maintained package repository.
- Original upstream source verified:
  `fe430b251eeaff4ff7c041085fd05458b2776cb9`.
- Fork: qualified `e47f475a37ddc04db1e68199c33041888a3d32c1`,
  `@justinbeausoleil/pi-goal-x@0.31.2-reliability.2`, tarball SHA256
  `1f32b6757aad3889933c543a3eead173747faf9c7f27860cbede98fdf5be3e64`.
  Its original qualification and rollback evidence remain in
  `~/Data/pi-goal-x/reliability/012/reliability-02/qualification.json` and
  `rollback/result.json`: full1358/1358, real-SDK serial958, supported-runtime
  native checks and78 restored rollback entries. None was rerun here.

## Decision for ticket014

Tickets013–014 complete their revised diagnostic/decision scope with an honest
inconclusive outcome. **G8's broader behavioral acceptance remains unpassed.**
Matrix02 remains0/6; matrix03 retains two failures, one interrupted run and three
unstarted cancellations. Those are acceptance attempts, not matched comparisons.

The implemented runtime repairs have deterministic and package evidence, but
there is no measured Qwen benefit sufficient to justify further automatic
spending. Stop here. Do not start another matrix, retry this diagnostic, install
new dependencies, prepare a recommended live-trial change or change live Pi
selection on the strength of these results. A future decision to investigate
the text-only tokenizer path would require its own bounded scope; no such work
is launched or presumed necessary by this report.

Validation: equivalent public goal/task/contract/evidence setup checked across
versions; source identity and qualified tarball hash verified; all four attempts
record zero dispatch. The provider implementation invokes `onPayload` before
`chat.completions.create`; both attempt04 errors arose in that hook. Documentation
links, diff whitespace and consistency with the spec's stop rule were checked.
