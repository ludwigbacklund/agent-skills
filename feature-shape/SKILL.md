---
name: feature-shape
description: Shape a spec'd feature into a thin skeleton design plus vertical, independently shippable slices. Phase A produces the skeleton, then Phase B slices it in the same run unless the user asks to pause. Use after feature-spec and before feature-implement. Triggers include "shape this feature", "design and slice this planning artifact", or an explicit /feature-shape invocation.
---

# /feature-shape — Skeleton + Slicing (two-phase)

Take a feature that's already been spec'd and shape it into (a) a thin cross-slice skeleton and (b) a set of vertical, independently shippable slices. The two phases share a litmus discipline and normally run back-to-back: Phase A saves the approved skeleton, then Phase B slices it. Pause between them only when the user explicitly asks or foundational decisions remain unresolved.

## When to use

- User invokes `/feature-shape <parent-ref>` (or just `/feature-shape` — then ask which parent artifact).
- The parent artifact should already have a brief from `/feature-spec`. If it doesn't, redirect to `/feature-spec` first.
- Comes after `/feature-spec`, before `/feature-implement`.
- The skill auto-detects which phase to run based on the parent artifact's state:
  - No `## Design` section → run **Phase A (skeleton)**, then continue to **Phase B**.
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

- **Read `../feature-spec/references/tracking-conventions.md` before doing anything else** and follow it throughout this workflow.
- Discover the repository's project instructions, existing planning/tracking conventions, and available tools. Use the existing system; do not introduce a new framework.
- Resolve and follow the project tracking mapping from the shared reference. Confirm it covers stable artifact references, parent/child hierarchy, dependencies, acceptance criteria, lifecycle state, structured notes/descriptions, drafts and follow-ups, metadata paths, and code-revision evidence. Prefer native tracker features; where unavailable, use explicit links and checklists.
- If there is no tracker, conventions conflict, or any mapping is ambiguous, ask the user before proceeding. Do not initialize, install, or invent a tracker or remote command syntax. Persist a newly resolved mapping in existing project documentation or, if that is not appropriate, on the parent artifact.
- Get the parent artifact reference:
  - If passed as an argument, use it.
  - Otherwise use the mapped listing/search operation and ask which parent artifact to shape.
- Retrieve the parent through the mapping and read its brief, lifecycle state, structured notes, and existing child links. If it has no brief, redirect to `/feature-spec`.
- Phase detection: if a `## Design` section already exists in the mapped planning content, this is a Phase B re-entry — skip to Phase B. If both design and child slices exist, ask whether to revise.

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

Once the user approves, retrieve the parent artifact's current planning content through the mapping, append the new `## Design` section, and save it back to the mapped description or structured-note location. Preserve the brief and other existing content. If revising an existing design, replace the previous `## Design` section rather than stacking a new one. Record draft/follow-up or lifecycle metadata through the mapping when the project conventions call for it.

#### A6. Continue to slicing

Once the approved skeleton is saved:

- Confirm it was saved (stable parent reference + mapped location or durable link) and summarize it in 1–2 lines.
- Continue directly to Phase B in the same run; the `/feature-shape` invocation authorizes both phases.
- Pause only if the user explicitly asks to stop or a foundational decision remains unresolved. On re-entry, the skill detects the saved skeleton and jumps straight to Phase B.
- If pausing after saving the skeleton, land that planning change using the same rules as **B6. Land the plan** so a later worktree can see it.

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

- Retrieve the parent through the project tracking mapping. Confirm `## Design` is present in its mapped planning content. If not, run Phase A first.
- Inspect mapped hierarchy links for existing child slices. If any exist, ask whether to revise (recreate) or stop. Don't silently stack new ones on top.

#### B2. Propose slices

Walk the brief and skeleton and propose **1–5 candidate slices**. Aim small — a slice that's "the whole feature minus polish" is not a slice, it's the feature.

A **single slice is a valid outcome** when the feature is naturally one thin end-to-end cut and splitting it further would only produce horizontal layers or scaffolding. Don't manufacture multiple slices to hit a quota — if the litmus test only justifies one, propose one and say so. The dependency graph and parallel-eligibility report simply become no-ops in that case.

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

#### B4. Reflect back (slicing + dependencies + acceptance criteria)

Present the proposed slicing in order. **Infer the dependency graph yourself** — for each slice, work out which prior slices it actually needs (extends an entity, reuses a new helper, builds on a new endpoint) and which it doesn't. Don't default to sequential; analyze the real code dependencies based on the design and what each slice delivers.

For each slice, include 2–4 acceptance criteria. Each AC must be:

- **Observable** — a tester (or you) can check it against the running system.
- **Scoped to this slice** — not a criterion for the whole feature.
- **Behavior, not implementation** — _"user sees X"_, not _"function returns Y"_.

> "Proposed slicing:
>
> 1. **Slice 1: [title]** — [what it delivers]. Validates [risky assumption].
>    - AC: [observable behavior]
>    - AC: [observable behavior]
> 2. **Slice 2: [title]** — [what it delivers]. Depends on Slice 1 ([reason]).
>    - AC: [observable behavior]
>    - AC: [observable behavior]
>
> Each slice is mergeable on its own. Anything off in the scope, order, dependencies, or acceptance criteria? Want to merge, split, reorder, or cut any?"

Use this as a **single approval gate** for the slices, dependency graph, and ACs. Iterate as needed, then record the approved graph and criteria for B5. Common adjustments:

- Combining two slices that together feel like one thin shippable unit.
- Splitting a slice that's secretly two pieces of value.
- Reordering to put a riskier slice first.
- Cutting a slice that turns out to be premature.
- Correcting a missed code dependency or acceptance criterion.

#### B5. Save

For each slice, in intended order, create a child planning artifact through the project tracking mapping. Record:

- A stable reference and explicit parent link to the feature artifact.
- Its title as `Slice <N>: <title>`.
- The approved acceptance criteria in the mapped native field or checklist.
- The user-visible behavior under `## What this slice delivers`.
- Deferrals under `## Out of scope for this slice`.
- Explicit dependency links to every prerequisite identified in B4; record none when the graph marks the slice independent.
- Any required lifecycle, structured-note, draft/follow-up, metadata-path, or revision-evidence fields.

Prefer native hierarchy, dependency, and acceptance-criteria features. If the tracker lacks one, use the explicit links/checklists prescribed by the mapping. Verify each child can be retrieved by its stable reference and that parent and dependency links resolve. Do not invent tool syntax.

#### B6. Land the plan

Make the approved parent design and child-slice graph a durable baseline accessible to implementation agents before implementation or fan-out begins.

- For a git-local plan, follow the repository's branch and commit conventions. If they are unclear, ask before changing branches. Commit only planning artifacts changed by this shaping run; do not include unrelated working-tree changes. Reference the parent's stable reference in the commit subject, report the SHA + subject, and do not push or open a PR. If the user asked not to commit or the commit fails, stop after shaping: `/feature-implement` and worktree fan-out must wait until the plan is committed.
- For a remote plan, durably save an approved revision or immutable snapshot accessible to all implementation agents and record its revision evidence through the mapping. A git commit is not required unless project conventions require one. Stop rather than fan out if agents cannot retrieve the approved revision.

Report back with:

- The created child artifact references in order, with their dependency graph.
- The approved planning revision/snapshot evidence and durable location (plus commit SHA + subject for a git-local plan).
- A summary of which slices can be implemented in parallel right now (those with no pending dependencies).
- The natural next step: _"Run `/feature-implement <slice-ref>` to start on slice 1, or fan out parallel slices once their dependencies clear and every agent can access the approved plan."_

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

**The phase transition:**

- ❌ Stopping after an approved skeleton when no decision is unresolved. Continue into slicing by default.
- ❌ Requiring a second approval for acceptance criteria after the user just approved the slice structure. Review both together once.
- ❌ Continuing when the user explicitly asked to pause or a foundational decision is unresolved.

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
- ❌ Starting implementation or fan-out before the approved design and slice graph are durable and accessible: selectively committed for git-local plans, or saved as an approved remote revision/snapshot.
