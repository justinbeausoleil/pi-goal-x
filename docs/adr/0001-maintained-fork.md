# Maintain a focused fork with upstream history

Status: accepted for repository creation, 2026-09-08.

The user authorized a fork of the investigated pi-goal-x package. Keep its Git
history, MIT attribution, and useful public behavior, and maintain the source
under ~/Developer/tools/pi-goal-x with origin pointing to the user's fork and
upstream to tmonk/pi-goal-x. This preserves reviewable upstream integration and
avoids reimplementing the established storage, drafting, and audit behavior.

Dotfiles will own only intentional machine integration. Repository SDLC
documents govern our development and add no goal-package feature. A rewrite
or embedding the package in dotfiles would increase ownership and migration
cost. An npm identity/release remains a later decision.
