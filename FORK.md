# Goal-reliability fork

This fork of [tmonk/pi-goal-x](https://github.com/tmonk/pi-goal-x) is being
prepared to repair automatic goal startup, task continuity through compaction,
and large task decomposition on Pi 0.85.1 with local Qwen models.

**Stage: isolated package qualification.** Development tickets001–011 passed
deterministic/native-host checks and independent review. The private package is
`@justinbeausoleil/pi-goal-x@0.31.2-reliability.1`. Package compatibility,
rollback and the fixed six-run Qwen acceptance gate remain in progress.

See the repository's [specification](https://github.com/justinbeausoleil/pi-goal-x/blob/feat/goal-reliability/spec.md),
[plan](https://github.com/justinbeausoleil/pi-goal-x/blob/feat/goal-reliability/plan.md),
and [14 development tickets](https://github.com/justinbeausoleil/pi-goal-x/blob/feat/goal-reliability/docs/tickets/README.md).
The package includes [release notes](RELEASE_NOTES.md), [architecture](docs/architecture.md),
the original [MIT license](LICENSE) and fork [notice](NOTICE).

The reviewed baseline is pi-goal-x 0.31.2 at
fe430b251eeaff4ff7c041085fd05458b2776cb9. Upstream history, license, and existing
feature records remain intact. Implementation, isolated package/model tests,
commits and branch pushes were authorized by the maintainer on2026-09-08.
The final ticket prepares adoption; it does not perform live installation.
No npm publication or upstream contribution is part of this work.
