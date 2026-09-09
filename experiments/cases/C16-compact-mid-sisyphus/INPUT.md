# C16 — compaction-then-resume mid sisyphus

## Behavior under test

While a 5-step sisyphus run is in progress, automatic compaction triggers
(compaction.json enables native settings; the threshold is the selected model's
context window minus reserveTokens). Verify current goal context on the next
executor request: the agent continues and completes the remaining steps, then
calls update_goal({status:"complete"}).

This optional historical case has no guaranteed pressure to reach that threshold.
Require an actual compaction event before citing it as compaction evidence; its
artifact rubric alone does not prove compaction. The fixed D6 Qwen fixture owns
the fork's real-model compaction acceptance.

## Prompts

TURN: /sisyphus "Sisyphus 5 steps: 1) create f1.txt with 'one'. 2) create f2.txt with 'two'. 3) create f3.txt with 'three'. 4) create f4.txt with 'four'. 5) create f5.txt with 'five'. autoContinue: true."
