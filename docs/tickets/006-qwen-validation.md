# 006: validate real multi-stage work with both Qwen models

**Status:** draft
**Blocked by:** 005: completion integrity (which depends on 003 and 004).
**Requirements:** G8; seam S3.
**What to build:** The maintainer can judge the fork using completed synthetic workspace tasks and real compaction behavior on both configured local Qwen models.

## Acceptance criteria

- [ ] Use both configured models through Pi, with synthetic workspace artifacts and native model-generated summaries.
- [ ] Run at least three trials per model, covering off and low thinking, with at least three actual compactions per trial.
- [ ] Make trials do and verify multi-stage work; current-task recall alone does not satisfy this ticket.
- [ ] Check final artifacts against independently specified expected results and confirm no required work was omitted or silently repeated.
- [ ] Record every attempt's model/Pi/package versions, thinking settings, compactions, token usage, retries, result, and limitations.
- [ ] Keep credentials/private documents out of traces; use no cloud fallback and report failed attempts rather than selecting only successful runs.

## Evidence

Pending implementation. Record the red/green commands, observed outcomes,
review findings, and remaining limitations here before marking done.
