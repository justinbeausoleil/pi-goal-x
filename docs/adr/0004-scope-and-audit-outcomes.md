# Retain scope separately from plans and label audit bypasses

Status: accepted by the maintainer, 2026-09-08; implementation evidence pending.

Keep free-text scope/contracts and the latest review outcome in the existing
authoritative goal record so plan deletion, settings changes, and best-effort
ledger failures cannot erase required work or rejection. Human-confirmed scope
revisions use the existing tweak workflow; preserve upstream's user-owned
audit bypasses as explicitly unverified completion, following
[plan D3](../../plan.md#d3--scope-confirmation-and-completion-authority).

This requires additive metadata and explicit rollback backups, but avoids a
new requirements database and preserves the user's ability to bypass review
without falsely claiming independent verification.
