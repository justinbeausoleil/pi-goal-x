# Milestones

- Confirmed clean main and existing CI requirements. npm 11.19.0 supports npm trust github with --allow-publish. User authorized configuration for unattended publishing; retain account 2FA.

- PR #51 merged after CI 34180264478 passed. actionlint passed; nine tag/metadata guard cases and four registry/idempotency guard cases passed.
- First rehearsal 34180410192 passed validation, context/provider checks and packaging, but npm 11.19.0 rejects an existing version even in dry-run mode. Added --force exclusively to the non-writing rehearsal to skip that registry version check. Actual publication never uses --force. Retain a separate artifact per run attempt; archive hashes can differ across operating systems, so existing-release integrity mismatches deliberately stop retries.
