---
name: feature-shape
description: Shape a spec'd feature into a thin skeleton design plus vertical, independently shippable slices. Two phases in one skill with a mandatory pause between them—Phase A produces the skeleton, the agent pauses and asks before continuing, and Phase B does the slicing. Use after feature-spec and before feature-implement. Triggers include "shape this feature", "design and slice this task ID", or an explicit /feature-shape invocation.
---

# /feature-shape — Skeleton + Slicing (two-phase)

Take a feature that's already been spec'd and shape it into (a) a thin cross-slice skeleton and (b) a set of vertical, independently shippable slices. The two phases share a litmus discipline but are separated by a mandatory pause — Phase A saves the skeleton and asks before continuing; Phase B does the slicing.

The pause is the point. It forces the skeleton to settle before slicing decisions are anchored to it, and keeps each phase's conversation focused.

## When to use

- User invokes `/feature-shape <task-id>` (or just `/feature-shape` — then ask which task).
- The task should already have a brief from `/feature-spec`. If it doesn't, redirect to `/feature-spec` first.
- Comes after `/feature-spec`, before `/feature-implement`.
- The skill auto-detects which phase to run based on the parent task's state:
  - No `## Design` section → run **Phase A (skeleton)**, then pause.
  - Has `## Design` but no child slices → jump straight to **Phase B (slicing)**.
  - Both exist → ask whether to revise the skeleton, re-slice, or stop.

---

## Phase A — Skeleton

### Litmus test (skeleton)

For every candidate decision, ask:

> _"If I cut any single slice from this feature, would the remaining slices still need this decision?"_

- **Yes** → foundational, include it.
- **No** → push it down to `/feature-implement`.

The whole point is to leave room for each slice to carry its own weight. **Locking in decisions that are too broad too early is the failure mode this phase exists to prevent.**

### What goes in

- **Data model** — entities, relationships, key invariants. Schema shape, not field-level details unless they encode an invariant.
- **Cross-slice contracts** — auth/permissions, public API surface, event/message shapes — anything multiple slices have to agree on.
- **Architectural decisions** — sync vs async, transactional boundaries, multi-tenancy, third-party integrations — the expensive-to-undo choices.
- **Back-compat strategy** — *only when an existing schema or public contract changes:* the expand→contract / versioning plan for evolving it without breaking old data or in-flight consumers. Expensive-to-undo and spans slices (one slice expands, a later one contracts), so it belongs in the skeleton. Brand-new shapes need no strategy.

### What stays out

- Component structure, file layout, naming.
- Specific endpoint shapes (beyond auth and the contract).
- UI layout, copy, visual design.
- Internal implementation details.
- "Nice to have" thinking that hasn't earned its place via the litmus test.

If you're not sure → it stays out. The skeleton should err small.

### Process

#### A1. Setup

- Verify `backlog` CLI is available: `which backlog`. If missing, stop and tell the user.
- Get the task ID:
  - If passed as arg, use it.
  - Otherwise run `backlog task list --plain` and ask which task to shape.
- Read the brief: `backlog task view <id> --plain`. If the task has no brief, redirect to `/feature-spec`.
- Phase detection: if a `## Design` section already exists, this is a Phase B re-entry — skip to Phase B. If both design and child slices exist, ask whether to revise.

#### A2. Survey what exists

Before surfacing decisions, do a short fact-finding pass on the code the design will touch. The goal is to ground the conversation on real current behavior so the design isn't reasoning against a hallucinated baseline.

- Identify the real names of components, routes, types, tables, and procedures this feature will modify or extend. Read the relevant files — don't infer from path conventions.
- For any contract about to be redesigned (existing API signature, schema, event shape), note its current shape verbatim.
- Keep it short — a brain-dump of _what is_, not _what will be_.

Treat the survey as fact-finding, **not** prescription. The skeleton is free to change any of it; the survey only ensures changes are made against the real baseline.

#### A3. Surface foundational decisions

Walk the brief and surface candidate decisions, applying the skeleton litmus test to each. Ask the user about them **one at a time**, never as a form. Likely areas to probe (not all will apply):

- **Data**: new entities? Relationships? Invariants that must hold across slices?
- **Contracts**: auth/permissions model? Public surface (API, events, types)?
- **Architecture**: anything async? Transaction boundaries? Third-party integrations that constrain the shape?
- **Migration & compatibility** (only if A2 showed this changes an *existing* schema or public contract): how does the existing shape evolve without breaking old data or old / in-flight consumers? The strategy spans slices — one slice expands, a later one contracts — so it's foundational, not per-slice. Skip entirely for brand-new tables/contracts.

For close calls, **say the test out loud**:

> "Does the choice of sync vs async here affect more than one slice? If only the first slice cares, we can defer it."

This trains alignment on what foundational means, and gives the user a chance to push back.

#### A4. Reflect back

After surfacing 2–3 decisions, summarize the skeleton in plain language:

> "So the foundation is: _new entities X and Y, X belongs to a workspace, Y is immutable. The auth model is Z. We're going synchronous for now._ That's it — everything else is per-slice. Sound right?"

Iterate until the user confirms without changes. **Alignment ≠ completeness** — a small skeleton everyone agrees on is the goal.

#### A5. Draft and save

Once aligned, draft the design section. Use this shape, **omitting any subsection that didn't earn a decision**:

```markdown
## Design

### Data model

- [Entity X]: [shape, key fields, key invariants]
- [Entity Y]: [shape, key fields, key invariants]
- Relationships: [how they connect]

### Contracts

- Auth: [permissions model]
- Public surface: [APIs / events / exported types other slices or consumers depend on]

### Architecture

- [Decision]: [chosen option] — [one-line rationale]

### Migration & compatibility

*(Only when an existing schema or public contract changes — omit otherwise.)*

- [existing shape that changes] → [strategy: additive / expand→contract / dual-write / versioned]
- Compatibility window: [what old code / consumers must keep working during rollout]
- Reversible: [yes | forward-only + why + recovery]

### Out of scope for the skeleton

- [Thing that came up but failed the litmus test — captured so it's not forgotten, deferred to /feature-implement]
```

Show the draft. Ask: _"Anything missing, wrong, or padded? Anything here that only one slice actually needs?"_ The second half of the question is the important one — it invites the user to challenge the skeleton's scope.

Once the user approves, append to the parent task's description:

1. Read current description: `backlog task view <id> --plain`.
2. Combine: existing description + blank line + new `## Design` section.
3. Write back: `backlog task edit <id> --plain -d "$(cat <<'EOF'
<combined markdown>
EOF
)"`.

If revising an existing design, replace the previous `## Design` section rather than stacking a new one.

#### A6. Pause and ask — mandatory

This is the pause point. Do not slide into slicing.

- Confirm the skeleton landed (task ID + path).
- Summarize what was saved in 1–2 lines.
- Ask the explicit pause question:

  > _"Skeleton saved. Want me to keep going and slice it now, or pause here so you can sit with it first?"_

- **Wait for the user's answer.** Do not volunteer slice candidates. Do not list what Phase B would do. Do not preempt the user's decision with "I'd recommend continuing" or similar nudges.
- If the user says "go" / "continue" / "slice it" → proceed to Phase B in the same conversation.
- If the user says "wait" / "hold" / "later" → stop. Tell them they can re-invoke `/feature-shape <task-id>` whenever they're ready; the skill auto-detects that the skeleton exists and jumps straight to Phase B.

The default disposition is to respect the pause. If the user is silent or non-committal, treat that as "pause" and stop — don't proceed on weak signal.

---

## Phase B — Slicing

### Litmus test (slicing)

For every candidate slice, ask:

> _"Could this slice be merged on its own and let a user do something they couldn't before?"_

- **Yes** → vertical slice, keep it.
- **No** → horizontal layer in disguise (just schema, just API, just UI). Recombine with adjacent slices until it earns its own user-visible value.

The classic failure mode is slicing by layer:

> ❌ Slice 1: DB migration. Slice 2: API endpoints. Slice 3: UI.

That's not vertical — none alone delivers value. The right shape:

> ✅ Slice 1: User can create a draft (DB + API + minimal UI for one path).
> ✅ Slice 2: User can publish a draft.
> ✅ Slice 3: User can revise after publish.

Each slice touches every layer it needs, and each ships something a user could try.

### Process

#### B1. Re-entry check

- Read the parent: `backlog task view <id> --plain`. Confirm `## Design` is present. If not, run Phase A first.
- If child slices already exist, ask whether to revise (recreate) or stop. Don't silently stack new ones on top.

#### B2. Propose slices

Walk the brief and skeleton and propose **1–5 candidate slices**. Aim small — a slice that's "the whole feature minus polish" is not a slice, it's the feature.

A **single slice is a valid outcome** when the feature is naturally one thin end-to-end cut and splitting it further would only produce horizontal layers or scaffolding. Don't manufacture multiple slices to hit a quota — if the litmus test only justifies one, propose one and say so. The dependency graph and parallel-fan-out steps below simply become no-ops in that case.

For each candidate, write down:

- **Title** — what the user can newly do (e.g. "User can save a draft").
- **What it delivers** — one sentence of user-visible behavior.
- **What it does NOT do** — explicit deferrals so the scope is sharp.
- **Layers touched** — confirm it hits every layer it needs (data, server, client, tests).

Apply the slicing litmus test to each. If any slice fails, recombine.

#### B3. Order by learning value

**Slice 1 should validate the riskiest assumption** — the thing most likely to be wrong, the choice you most want feedback on. Don't lead with the easiest slice; lead with the one that teaches you the most.

Examples of "riskiest assumption":

- A novel UX pattern users haven't seen before → ship a stub of it first to test reactions.
- A third-party integration that might not behave as expected → exercise it first.
- A schema choice that's expensive to change → build the slice that exercises the trickiest invariant.

Later slices add capability now that the foundation is validated.

#### B4. Reflect back (slicing + dependencies)

Present the proposed slicing in order. **Infer the dependency graph yourself** — for each slice, work out which prior slices it actually needs (extends an entity, reuses a new helper, builds on a new endpoint) and which it doesn't. Don't default to sequential; analyze the real code dependencies based on the design and what each slice delivers.

> "Proposed slicing:
>
> 1. **Slice 1: [title]** — [what it delivers]. Validates [risky assumption].
> 2. **Slice 2: [title]** — [what it delivers]. Depends on Slice 1 ([reason — extends the entity / reuses the new endpoint]).
> 3. **Slice 3: [title]** — [what it delivers]. Depends on Slice 1 only — independent of Slice 2 ([reason]).
>
> Each slice is mergeable on its own. Anything off? Want to merge, split, reorder, or cut any? Anything wrong about the dependencies?"

Iterate until the user approves the slicing and the inferred graph. Common adjustments:

- Combining two slices that together feel like one thin shippable unit.
- Splitting a slice that's secretly two pieces of value.
- Reordering to put a riskier slice first.
- Cutting a slice that turns out to be premature.
- Correcting a missed code dependency.

Record the approved dependency graph for use in B6.

#### B5. Define acceptance criteria

For each approved slice, draft 2–4 acceptance criteria. Each AC must be:

- **Observable** — a tester (or you) can check it against the running system.
- **Scoped to this slice** — not a criterion for the whole feature.
- **Behavior, not implementation** — _"user sees X"_, not _"function returns Y"_.

Show the ACs to the user before saving. One last chance to challenge them.

#### B6. Save

For each slice (in order), create a child task. Slices that depend on prior slices reference them with `--depends-on` — the prior slice must already exist, which is why we create in order.

```bash
backlog task create "Slice <N>: <title>" \
  -p <parent-id> \
  --depends-on <prior-slice-id-or-comma-list> \
  --plain \
  --ac "AC 1" \
  --ac "AC 2" \
  --ac "AC 3" \
  -d "$(cat <<'EOF'
Part of <parent-id>.

## What this slice delivers
[One paragraph — user-visible behavior]

## Out of scope for this slice
- [Deferred to later slices]
EOF
)"
```

Omit `--depends-on` for slice 1 (no prior) and for any slice the inferred graph marks as independent of all priors. Use the dependency graph captured in B4.

Create slices in the intended order so child IDs reflect that order, and so `--depends-on` references resolve. Report back with:

- The list of created task IDs (in order), with their dependency graph.
- A summary of which slices can be implemented in parallel right now (those with no pending dependencies).
- The natural next step: _"Run `/feature-implement <slice-id>` to start on slice 1, or fan out parallel slices in worktrees once their dependencies clear."_

---

## Anti-patterns

**Phase A (skeleton):**

- ❌ Designing things that only one slice needs ("the button should be blue"). Push to `/feature-implement`.
- ❌ Producing an exhaustive design covering every screen and endpoint. The skeleton is one page.
- ❌ Specifying field-level details unless they encode a cross-slice invariant.
- ❌ Sketching UI layout or component structure. Per-slice.
- ❌ Writing the design before the user has confirmed a reflection.
- ❌ Replacing the brief instead of appending to it. The artifact is the _trail_ — brief → design → slices.
- ❌ Padding the design with sections that didn't earn a decision. Empty sections are a smell.
- ❌ Skipping the as-is survey and inventing names or shapes for existing code.
- ❌ Letting the as-is survey become prescription. Surveying ≠ committing to preserve.
- ❌ Changing an existing column or public contract in the skeleton without a compatibility strategy. Renames and drops break old code mid-rollout — decide expand→contract here, where the cross-slice plan lives.

**The pause:**

- ❌ Sliding from Phase A directly into Phase B without stopping. The pause is the whole point.
- ❌ Phrasing the pause question as a nudge ("Ready to slice now?" assumes yes). Use the neutral framing in A6.
- ❌ Listing candidate slices in the Phase A wrap-up as a "preview". That preempts the pause.
- ❌ Reading non-committal answers as "go". When in doubt, treat silence as "pause."

**Phase B (slicing):**

- ❌ Horizontal slices ("Slice 1: schema. Slice 2: API. Slice 3: UI."). None of those alone delivers value.
- ❌ Slices that depend on a later slice to be useful. Each must stand alone.
- ❌ Ordering slices by ease rather than by learning value. Easy-first means risk-last.
- ❌ One giant slice ("build it all"). That defeats the point.
- ❌ Manufacturing extra slices to hit a quota. If only one slice survives the litmus test, ship one.
- ❌ Acceptance criteria that describe the whole feature, not this slice.
- ❌ Acceptance criteria that name implementation details ("uses Postgres", "calls foo()"). Test behavior, not internals.
- ❌ Saving slices before the user has approved both the slicing and the ACs.
- ❌ Silently stacking new slices on top of existing ones when the user re-runs the skill.
- ❌ Defaulting to "all sequential" without analyzing what each slice actually needs from prior slices.
