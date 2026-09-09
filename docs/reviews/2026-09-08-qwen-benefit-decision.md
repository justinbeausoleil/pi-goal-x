# Bounded Qwen benefit diagnostic and adoption decision

**Result: a positive progress signal within two responses per version.**
The fork wrote the exact required file on its first response and marked its task
complete on its second. Upstream retrieved the goal, then checked whether the
file existed; it had not written the file when its two-response allowance ended.
Both preserved completed work. This is one controlled scenario, not a general
reliability result or proof of net token savings.

The pair used **four Qwen requests, 12,102 tokens and13.405 seconds**. There were
no repeated model runs, generated summaries, model judges or package retests.

| Observation | Upstream | Qualified fork |
| --- | --- | --- |
| Response1 | Read goal state | Write shipping label |
| Response2 | Read prospective output; file absent | Mark label task complete |
| Required artifact produced | No | Yes, exact bytes |
| Completed receipt preserved | Yes | Yes |
| Input tokens | 5,228 | 6,501 |
| Output tokens | 157 | 216 |
| Total tokens | 5,385 | 6,717 |

The fork used more tokens than the unfinished upstream run, while completing
the work inside the same response allowance. Upstream identified the correct
task and requirement after reading goal state. Its eventual completion cost was
not measured; this does not establish that upstream would fail with more turns.

## Method and limits

Both versions used public goal tools to select `label`, leave an earlier pending
task unselected, and preserve completed `receipt.txt`. The current contract
required `shipping-label.txt` containing exactly `ACCOUNT=007` plus one newline.
Independent, frozen checks scored the work artifact, leading-zero requirement
and absence of repeated writes to the completed receipt.

Equivalent public setup crossed one native manual compaction with the same
recorded lossy summary. Native system guidance, read/write and the five normal
goal tools were retained. Qwen3.6 thinking was off, temperature0.2, top-p0.95.
The differing native goal projections and schemas were allowed to do their
normal work. This is a controlled information-loss diagnostic, not a test of
Qwen-generated summaries, threshold compaction or the full completion auditor.

All four payloads were counted before dispatch:2432/2796 upstream and3246/3255
fork input tokens. Server-reported counts matched exactly. Every request stayed
below4096 input and256 generated tokens; total12102 stayed below17408. Both
versions received two responses. No truncation, provider error or setup failure
occurred during the actual pair. Model limits exclude Codex preparation tokens.

**Reporting limitation:** the raw driver's upstream status is `INCONCLUSIVE`
because it groups model tool errors with harness errors. Its only recorded error
was Qwen reading the not-yet-created output (`ENOENT`). The raw fork status is
`PASS`. All setups and generations succeeded; the frozen artifact checks above
show the observed difference. `assessment.json` explains this distinction without
rewriting raw results or rerunning the models. Interpret this as a progress
signal, not a clean automated acceptance verdict.

## Offline preparation correction

The earlier preflight-only no-go decision was premature and is superseded by
this result. The maintainer correctly asked why a repairable tool error ended
work. The standalone counter had skipped the model-module import that registers
MLX's NumPy processor, falling through to the Transformers processor that asks
for PyTorch/Torchvision. Importing the installed `qwen3_5_moe` module fixes the
actual cause without installing dependencies or loading model weights.

Offline attempts01–02 exposed asynchronous command setup timing;03 exposed
native automatic activation of goal tools;04 exposed the omitted registration.
All used zero Qwen requests. Attempts05–06 passed token preflight after repair.
The corrected counter also exactly matched a retained real-server payload's
3477 input tokens. These were preparation checks, not model resamples.

## Evidence and decision for ticket014

- Actual pair: `~/Data/pi-goal-x/reliability/013/benefit-run-01/` contains the
  frozen fixture/source hashes, public setup, compaction/tool events, complete
  payloads/responses, raw results and the separate `assessment.json`.
- Offline attempts remain in `benefit-preflight-01/` through `benefit-preflight-06/`
  under the same Data013 directory. The earlier `benefit-decision.json` records
  the superseded preflight-only outcome; it is retained, not current guidance.
- Probe source frozen at `d643ee1`; native guard/counter rehearsal command:
  `node --experimental-strip-types experiments/reliability/benefit-probe.mjs preflight NEW_EVIDENCE_DIRECTORY`.
- Upstream: `fe430b251eeaff4ff7c041085fd05458b2776cb9`.
  Fork: `e47f475a37ddc04db1e68199c33041888a3d32c1`,
  `@justinbeausoleil/pi-goal-x@0.31.2-reliability.2`, SHA256
  `1f32b6757aad3889933c543a3eead173747faf9c7f27860cbede98fdf5be3e64`.
  Upstream source cleanliness and all68 installed fork files were checked.
- Existing qualification/rollback evidence:
  `~/Data/pi-goal-x/reliability/012/reliability-02/qualification.json` and
  `rollback/result.json`: full1358/1358, real-SDK serial958, supported-runtime
  native checks and78 restored rollback entries. Runtime/package code is unchanged.

**Stop model spending after this pair; no live adoption recommendation.**
The fork now has a concrete, small example of faster progress after compaction.
Broader G8 acceptance remains unpassed: matrix02 was0/6, and matrix03 retains
two failures, one interruption and three unstarted cancellations. The diagnostic
does not waive that gate or authorize a live configuration change.

The smallest remaining question is whether this progress advantage repeats on
another representative task and outweighs the added input context. If the
maintainer later chooses to investigate, propose one additional fixed pair under
the same cap, first separating model tool errors from harness failures in the
reporter. Do not launch it automatically. No further evaluation or dependency
installation is required to retain the improvements already proved deterministically.
