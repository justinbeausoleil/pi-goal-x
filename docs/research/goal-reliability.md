# Goal reliability: baseline evidence and development sources

Recorded 2026-09-08. Product baseline: pi-goal-x 0.31.2 at
[fe430b251eeaff4ff7c041085fd05458b2776cb9](https://github.com/tmonk/pi-goal-x/tree/fe430b251eeaff4ff7c041085fd05458b2776cb9).
Target host: Pi 0.85.1.

## Verified failures

- Automatic direct startup produced one model request and zero
  before_agent_start calls; the goal objective was absent from that request.
- Threshold and overflow compaction preserved current task t40 on disk but
  omitted it from the next model request.
- The public task converter accepted 50 nodes and rejected 51.

A real Pi session/loader reproduction with scripted provider responses and
lossy summaries made the failures repeatable. Adding fresh per-response
context repaired those probes. A 200-node stored fixture survived three
compactions; both local Qwen models subsequently answered t42 correctly.

Limits: the large fixture bypassed public task creation and used scripted
summaries; it did not complete 200 real tasks. No historical goal session was
available to establish the exact past incident or a Qwen-specific failure
rate. The development spec requires stronger public-tool and real-model proof.

Sources:
[goal event handlers](https://github.com/tmonk/pi-goal-x/blob/fe430b251eeaff4ff7c041085fd05458b2776cb9/extensions/goal-events.ts),
[task converter](https://github.com/tmonk/pi-goal-x/blob/fe430b251eeaff4ff7c041085fd05458b2776cb9/extensions/goal-task-tools.ts),
[Pi session lifecycle](https://github.com/earendil-works/pi/blob/d981de1229ef899957bbe968bc8dcda02a21f477/packages/coding-agent/src/core/agent-session.ts).
The maintainer's reproducible investigation lives in the separate
pi-goal-compaction lab repository; ticket 001 ports relevant cases into this
fork without shipping the experimental hook.

## Why these development records exist

Anthropic's [AI-native SDLC playbook](https://claude.com/blog/the-ai-native-sdlc-playbook)
connects versioned intent, specification, implementation plan, verification,
review, and maintenance feedback. It recommends reviewing the plan before
coding and retaining an artifact trail. We apply that process to this
goal-reliability change.

Our local adaptation puts intent/spec/plan at the root, work tickets under
docs/tickets, and shared agent instructions in AGENTS.md with a CLAUDE.md import.
These are repository conventions, not claims that the article mandates every
filename or requires an enterprise governance platform.

Installed skill guidance used:
- to-spec: synthesize prior discussion, define user-visible requirements and
  review the test seams.
- to-tickets: small vertical slices with explicit blocking edges.
- domain-modeling: a glossary-only CONTEXT.md and concise trade-off ADRs.
- codebase-design: reuse deep modules and test at their public interfaces.
- writing-for-agents: short, conditional pointers to canonical records.
- tdd: agree seams before new tests, then one red-to-green slice at a time.

Local skill entry points are under ~/.agents/skills/<name>/SKILL.md. Tools and
skills remain environment capabilities; the fork does not bundle their text,
install them, or claim their workflows are already automated.
