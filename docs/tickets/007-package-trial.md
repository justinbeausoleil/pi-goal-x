# 007: prepare an isolated package trial and rollback

**Status:** draft
**Blocked by:** 006: real Qwen validation; explicit authorization for live package selection changes.
**Requirements:** G9; seams S1 and S2 plus an isolated package-install trial.
**What to build:** The maintainer can try the verified fork as one Pi package, retain existing goal data, and return to the previous package safely.

## Acceptance criteria

- [ ] Choose a distinguishable package identity or pinned Git source; preserve MIT attribution and verified upstream ancestry.
- [ ] Pack and load through the real Pi package/extension loader using an isolated runtime directory.
- [ ] Verify pre-fork goal records and sessions remain usable and test rollback using copied synthetic data.
- [ ] Record exact supported Pi versions from actual checks; do not widen peer ranges on inference.
- [ ] Prepare the intended dotfiles package-reference/check changes while preserving unrelated user settings/packages and credentials.
- [ ] Apply live selection changes only within explicit authorization; do not co-load competing goal implementations or publish under upstream's npm identity.

## Evidence

Pending implementation. Record the red/green commands, observed outcomes,
review findings, and remaining limitations here before marking done.
