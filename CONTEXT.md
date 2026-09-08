# Persistent goal management

This context describes a user's long-running objective and the work and
evidence needed to achieve it.

## Language

**Goal**:
A user-approved outcome that remains relevant until completed or deliberately
stopped. _Avoid_: development ticket, chat turn.

**Objective**:
The user's statement of the outcome and scope of a goal.
_Avoid_: current task, latest request.

**Requirement**:
A condition the goal must satisfy unless the user explicitly revises its scope.
_Avoid_: optional plan step.

**Task**:
A named piece of goal work with its own progress and optional verification
contract. _Avoid_: development ticket, assistant response.

**Task plan**:
The hierarchy of tasks chosen to achieve a goal; changing that plan does not
by itself change the goal's requirements. _Avoid_: objective.

**Verification contract**:
The evidence a goal or task requires before it can be considered satisfied.
_Avoid_: completion claim.

**Evidence**:
An attributable observation of an artifact, check, or external result used to
assess a verification contract. _Avoid_: assertion that work is done.

**Focus**:
The goal a user has selected for a particular session. _Avoid_: ownership of
every goal in a project.

**Current task**:
The task selected for ongoing work within the focused goal.
_Avoid_: first pending task, most recent completed task.

**Continuation**:
A further attempt to advance an active goal without another substantive user
request. _Avoid_: new goal, new requirement.

**Completion audit**:
An independent assessment of a completion claim against requirements and
evidence. _Avoid_: task count, successful tool call.

**Latest completion review**:
The most recent audit outcome or explicit bypass, together with its report and
the work it assessed. _Avoid_: complete review history, executor claim.

**Blocker**:
An impediment that prevents required progress and remains unresolved after
concrete attempts. _Avoid_: unfinished work, pause.

**Pause**:
A deliberate suspension of autonomous goal work while preserving its progress.
_Avoid_: completion, abandonment.

**Retained scope**:
The objective and requirements still owed to the user, regardless of changes
to the task plan. _Avoid_: current task list, conversation summary.

**Scope revision**:
A human-confirmed change to retained requirements, with a record of what
changed and why. _Avoid_: task deletion, auditor bypass.

**Audit-skipped completion**:
A completion recorded under the user's choice to bypass independent review.
_Avoid_: verified completion, waived scope.

**Budget limit**:
A stop on autonomous goal work after its allotted token usage is reached.
_Avoid_: completion, blocker.

**Oracle consultation**:
Optional independent advice about a concrete blocker and possible next work.
_Avoid_: completion audit, progress evidence.
