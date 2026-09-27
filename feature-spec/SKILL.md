---
name: feature-spec
description: Interview a user to create and save an approved problem brief before design or implementation. Use for /feature-spec, "spec out a feature," "brief this," or planning a new feature; skip for trivial fixes.
---

# /feature-spec — Problem brief

## Start

Read `references/tracking-conventions.md` and follow the project's instructions and tracking conventions.

Use the supplied feature name as a working title, or ask: **“What's the feature, in a few words?”** On a rerun, retrieve and revise the existing parent artifact rather than creating a duplicate.

## Interview for the problem

Ask one question at a time, or one tightly related pair. Let each answer shape the next question. This interview defines the problem, not its solution: do not design screens, APIs, schemas, or implementation unless needed to state a real constraint.

Learn only what is useful for alignment:

- Who experiences the problem, and what triggers the primary situation?
- What happens today, including the workaround and its cost?
- What must the person have accomplished when they stop, and how will they know?
- Which situations are routine and which are exceptions? Confirm frequency or priority where it affects scope; do not invent it.
- What must not change?
- What tempting work is outside this feature?

Probe vague words such as “better” or “faster” until they become observable. Every two or three answers, reflect the understanding in plain language and invite correction, for example:

> The problem is X for Y; today they do Z. We will know it worked when O, within constraint C. Is that right?

Continue until the user confirms the complete reflection. For user-facing work, include one concrete primary scenario: trigger → desired outcome and evidence of completion, without designing the steps yet. Distinguish confirmed facts from assumptions; ask rather than inventing a representative scenario. Do not use a fixed questionnaire or infer approval from silence.

## Draft and approve

Draft a short brief using only sections supported by the conversation:

```markdown
## Problem
[What is wrong or missing, for whom, and the important current cost]

## Primary scenario
[Confirmed actor and trigger → completed job; routine case versus relevant exceptions]

## Why now
[Why it matters now, if discussed]

## Success criteria
- [Observable outcome; for user-facing work, include successful completion of the primary job, not only access to capabilities]

## Constraints
- [Constraint]

## Non-goals
- [Explicit exclusion]
```

Omit empty sections. Keep proposed solutions out of the brief unless the user stated one as a constraint. Show the draft and ask: **“Anything missing, wrong, or padded?”** Revise until the user explicitly approves it.

## Save and hand off

Save the approved brief in the existing parent planning artifact, or create that artifact using the project's tracking conventions. Preserve unrelated content and read it back. Follow `tracking-conventions.md` to make the approved revision durable; never invent a tracker, push, or open a PR.

Report the stable parent reference, durable location, and approved revision evidence (including a planning commit when required). If durability is blocked, say so and do not imply shaping can fan out safely. Finish with: **“When you're ready, run `/feature-shape <parent-ref>` to design the skeleton and slices.”**
