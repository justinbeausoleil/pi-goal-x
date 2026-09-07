# Milestones

- Planning inspection: main e0411fb is clean, npm/GitHub latest 0.31.0; TypeScript, lint and 923 tests pass. Four open issues (#45, #47, #48, #49), one open PR (#46, e594a64e); PR is mergeable and maintainers may edit it.
- Reproduced undefined questionnaire result and proposal TypeError. Reproduced the reported audit history through SDK 0.84.1 conversion: it synthesizes a second result for the same call; removing the audit display message restores one paired result.
- Verified pi-subagents 0.60.0 launch source sets PI_SUBAGENT_CHILD=1 and increments PI_SUBAGENT_DEPTH. Current goal startup restores inherited focus and arms continuation without a child guard.
- Began implementation on codex/pr-46-drafting and merged origin/main into the original contributor commits without conflicts.

- Hardened PR #46 with direct RPC dialogs, safe unknown-host factory fallback, unambiguous recommendations/custom choices, auditor selection, and explicit failure handling. Corrected proposal summaries to show the selected auditor setting. Original contributor commits retained.
- Drafting validation: 947/947 full-suite tests, TypeScript, lint, discovery self-check, 24 context fixtures and six real-SDK provider-payload checks pass. Added 24 tests since main; no baseline drift.
