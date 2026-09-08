# Goal-reliability fork

This fork of [tmonk/pi-goal-x](https://github.com/tmonk/pi-goal-x) is being
prepared to repair automatic goal startup, task continuity through compaction,
and large task decomposition on Pi 0.85.1 with local Qwen models.

**Stage: design review. Product fixes are not implemented yet.** The package
still has upstream's name, version, and known limitations. Do not install it
as a repaired release based on the documentation alone.

Start with [intent](intent.md), [spec](spec.md), [plan](plan.md), and
[14 development tickets](docs/tickets/README.md), and the
[lifecycle coverage/red-team review](docs/reviews/2026-09-08-ticket-red-team.md). [CONTEXT.md](CONTEXT.md) defines
the domain language; [ADRs](docs/adr) preserve architectural trade-offs;
[AGENTS.md](AGENTS.md) provides repository guidance.

The reviewed baseline is pi-goal-x 0.31.2 at
fe430b251eeaff4ff7c041085fd05458b2776cb9. Upstream history, license, and existing
feature records remain intact. Fork creation and documentation are authorized;
implementation design/seams await review, and installation/publication have
their own scope. The final ticket prepares adoption; it does not require or
perform live installation.
