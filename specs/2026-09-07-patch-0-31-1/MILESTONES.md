# Milestones

- Planning inspection: main e0411fb is clean, npm/GitHub latest 0.31.0; TypeScript, lint and 923 tests pass. Four open issues (#45, #47, #48, #49), one open PR (#46, e594a64e); PR is mergeable and maintainers may edit it.
- Reproduced undefined questionnaire result and proposal TypeError. Reproduced the reported audit history through SDK 0.84.1 conversion: it synthesizes a second result for the same call; removing the audit display message restores one paired result.
- Verified pi-subagents 0.60.0 launch source sets PI_SUBAGENT_CHILD=1 and increments PI_SUBAGENT_DEPTH. Current goal startup restores inherited focus and arms continuation without a child guard.
- Began implementation on codex/pr-46-drafting and merged origin/main into the original contributor commits without conflicts.

- Hardened PR #46 with direct RPC dialogs, safe unknown-host factory fallback, unambiguous recommendations/custom choices, auditor selection, and explicit failure handling. Corrected proposal summaries to show the selected auditor setting. Original contributor commits retained.
- Drafting validation: 947/947 full-suite tests, TypeScript, lint, discovery self-check, 24 context fixtures and six real-SDK provider-payload checks pass. Added 24 tests since main; no baseline drift.

- Setback: contributor-fork pushes rejected over both HTTPS and SSH despite maintainerCanModify=true. Preserved amendments in commit 1749760 and continued on codex/release-0.31.1; TECH records the checked maintainer-PR integration path.
- Installed isolated SDK 0.83.0 and 0.84.4 dependencies for final compatibility validation.

- Implemented session-scoped audit transcript queue and historical audit context filtering, plus early delegated-child isolation. Updated the focus-race regression to switch focus during the auditor itself rather than relying on unsafe in-tool transcript dispatch.
- Real-SDK lifecycle tests pass for approval/rejection/skip/abort/error and fresh/fork/resume/nested children, including a 6.5-second initial fork prompt. Initial history fixtures counted both the capture hook and local HTTP dispatch because the SDK catches hook exceptions; corrected the harness to use real local Completions and Responses SSE responses and verify completed historical sessions.
- Release date crossed midnight in Europe/London; changelog uses 2026-09-08 and the original 2026-09-07 spec directory remains the implementation record.

- Final production implementation on pinned SDK 0.84.1 passes TypeScript, lint and all 961 tests (including 11 real-SDK session/protocol subprocess scenarios); no tests skipped. Production dependency audit reports zero vulnerabilities; NAF CI gate and package dry run pass. Context/provider validation remains unchanged.
