# Preserve project goal authority and session-local focus

Status: proposed.

Retain the existing durable project goal records and keep session focus
separate. Compaction or backward conversation navigation changes what the
model remembers, not which project requirements have been satisfied. An
explicitly focused resumed session reconciles the latest project goal before
work; a newly forked session must not silently acquire autonomous execution
from inherited chat history.

A session-only ledger would change existing cross-session semantics and has a
pre-first-assistant persistence caveat in Pi. Keep storage compatibility and
reject stale task revisions through the shared mutation interface instead.
Simultaneous autonomous execution of the same goal is not added by this work;
stop/ownership rules and conflict behavior must be tested through real session
operations. User-approved goal duplication or rewinding is a separate feature.
