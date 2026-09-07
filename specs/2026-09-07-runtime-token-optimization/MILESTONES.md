# Milestones

- Implementation started from 59826ec818aa8883329a74c62000d18aa1e1dbfe; clean working tree. Planning baseline: 896 tests, TypeScript, and existing context gate passed.
- Inspection found context capture counted all registered tools while omitting SDK snippets/guidelines; drafting/compaction fixtures did not actually drive those lifecycle states.
- Activity derivation measured locally at p50 0.107 ms/1k, 1.181 ms/10k, 18.816 ms/100k events.

- Corrected the measurement harness before runtime changes. It now uses actual active schemas, SDK tool snippets/guidelines, complete conversation records, goal-tool/custom messages, and isolated auditor/Oracle requests. Drafting and compaction fixtures now invoke their real lifecycle paths. The baseline is original HEAD in an isolated checkout with the identical corrected measurement harness.
