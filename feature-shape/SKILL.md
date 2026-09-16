---
name: feature-shape
description: Turn an approved feature brief into a thin cross-slice design and approved vertical slices with acceptance criteria. Use after feature-spec for /feature-shape, "shape this feature," or "design and slice this plan."
---

# /feature-shape — Thin design and vertical slices

## Start

Read `../feature-spec/references/tracking-conventions.md` and follow the project's instructions and tracking conventions.

Load the supplied parent reference, or ask the user which parent to shape. Read its approved brief and existing design and children. If there is no approved brief, use `/feature-spec` first.

On reruns, reuse and reconcile existing design, slices, links, and notes; never silently duplicate them. If design exists but slices do not, continue with slicing. If both exist, ask whether to revise or stop.

Normally complete both phases in one run. Pause only when the user asks or a foundational decision is unresolved.

## Phase A: thin cross-slice skeleton

A skeleton contains only decisions that multiple slices must share. For each candidate ask:

> If any one slice were removed, would the remaining slices still need this decision?

If no, defer it to that slice's implementation. Keep UI details, file layout, component names, endpoint internals, and one-slice choices out.

### Ground in the current system

Do a short, targeted code survey before proposing changes:

- Read the relevant code and record the real names of components, routes, types, tables, or jobs involved.
- Capture the current shape of any schema or public contract that may change.

This is a factual baseline, not a design prescription. Stop once the foundational conversation is grounded.

### Decide and approve

Ask about applicable foundational choices one at a time: key entities and invariants, shared auth or public contracts, transaction or async boundaries, tenancy, and constraining integrations.

When an existing schema or public contract changes, include a compatibility and migration approach (for example additive change, versioning, or expand–contract), the compatibility window, and recovery/reversibility. Omit migration planning for wholly new shapes.

Reflect the small set of decisions back after every few answers. Draft only the sections that earned a decision:

```markdown
## Design
### Data and invariants
- ...
### Shared contracts
- ...
### Architecture
- [decision and brief reason]
### Migration and compatibility
- [old-to-new rollout, compatibility window, recovery]
### Deferred to slices
- ...
```

Ask: **“Anything missing, wrong, or padded? Does anything here belong to only one slice?”** Revise until the user explicitly approves. Then update the parent's design without replacing its brief or stacking duplicate design sections, and read it back.

Continue directly to slicing unless paused. If pausing, make this approved revision durable according to the shared tracking conventions.

## Phase B: vertical slices

A slice is a real, end-to-end capability that can be merged and shipped independently once its genuine prerequisites are present. It must let a user or operator do something they could not do before and must not rely on a later slice to become useful.

A schema-only, API-only, UI-only, or test-only step is not a slice. Combine layers until the result delivers observable value. One slice is valid when further splitting would create scaffolding or horizontal layers.

### Propose and order

Propose one to five small slices. For each state:

- a title phrased as the new capability;
- what it delivers and explicitly defers;
- the layers needed for that end-to-end path;
- two to four observable, slice-scoped acceptance criteria.

Put the slice that tests the riskiest assumption first, not the easiest work. State what it teaches.

Infer dependencies from the actual design and code: add a prerequisite only when the slice truly uses something delivered by it. Do not make every slice sequential by default. A dependent slice must still be independently shippable when its stated prerequisites are met.

### Approve together

Present the ordered slices, acceptance criteria, risk rationale, and dependency graph in one review. Ask the user to correct scope, order, dependencies, or criteria. This is one approval gate: revise all of them together until explicitly approved.

Check every approved slice:

- It delivers observable value across every layer it needs.
- It can ship without any later slice.
- Its criteria describe behavior, not implementation.
- Its dependencies are real and point only to prerequisites.

### Save and hand off

Save each approved slice as an ordered child using the project's tracking conventions. Include its stable parent link, delivered behavior, deferrals, acceptance criteria, and explicit prerequisite links (or none). Reuse matching children on reruns and preserve unrelated content. Verify the parent and dependency links by reading them back.

Follow `tracking-conventions.md` to make the approved parent design and combined slice/criteria/dependency plan a durable baseline before implementation or fan-out. Do not implement code, push, or open a PR.

Report the parent and child references, durable revision evidence, dependency graph, and which slices currently have no pending prerequisites. If durability failed, report the block rather than authorizing implementation.

When the plan is durably saved, finish with: **“Run `/feature-implement <slice-ref>` for a ready slice.”**
