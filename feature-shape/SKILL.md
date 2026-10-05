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

For user-facing work, establish a concrete ordinary experience before choosing shared technical foundations and slices. A skeleton contains that journey and only the other decisions that multiple slices must share. For each candidate beyond that journey ask:

> If any one slice were removed, would the remaining slices still need this decision?

If no, defer it to that slice's implementation. Keep one-slice internals out of shared commitments. A sketch or prototype may show layout, controls, and copy needed to judge the journey without freezing those provisional choices. Shared interaction decisions are foundations, not merely UI details.

### Ground in the current system

Do a short, targeted code survey before proposing changes:

- Read the relevant code and record the real names of components, routes, types, tables, or jobs involved.
- Capture the current shape of any schema or public contract that may change.

This is a factual baseline, not a design prescription. Stop once the foundational conversation is grounded.

### Shape the user journey

For user-facing work, carry the brief's confirmed primary scenario into a concrete walkthrough. If it is missing, clarify it rather than inventing the job. Use illustrative, representative data to show what the person sees, decides, and does through recognizable completion. Prefer familiar product patterns. For a familiar interaction, a sketch or short walkthrough can suffice; for unfamiliar interactions or consequential uncertainty, exercise a rough clickable prototype before approving the direction. Disposable prototype code is allowed within shaping: isolate it from production, use safe fixtures, and label simulated behavior. It is design evidence, not verified implementation; do not build the full backend to judge the interface.

Compare with a materially simpler approach that accomplishes the same job and respects genuine constraints. Removing a required capability is not a useful simpler alternative. Explain the choice in terms of user effort and uncertainty, not code or control count. Separate system guarantees from concepts the person must understand.

Show why each required decision belongs at that point; defer incidental choices and reveal exceptional machinery when relevant. Preserve meaningful control, accessibility, and timely consequences. Include the concrete experience and comparison in the existing design approval, not a new gate. Later implementation and settlement exercise this same job, not a tour of the chosen controls.

### Decide and approve

Ask about applicable foundational choices one at a time: key entities and invariants, shared auth or public contracts, transaction or async boundaries, tenancy, and constraining integrations.

When an existing schema or public contract changes, include a compatibility and migration approach (for example additive change, versioning, or expand–contract), the compatibility window, and recovery/reversibility. Omit migration planning for wholly new shapes.

Reflect the small set of decisions back after every few answers. Distinguish commitments (outcomes, consequential behavior, hard constraints) from provisional choices (layout, grouping, disclosure, copy). Flag any apparently small choice that changes what the person must understand or do. Draft only the sections that earned a decision:

```markdown
## Design
### User journey
- [Concrete ordinary journey and sketch/prototype where useful; what the person sees, decides, does, and recognizes as completion]
- [Simpler same-job alternative and reason for the choice]
- [Committed behavior versus provisional interaction choices; system-only guarantees]
- [Consequential uncertainty and how it was investigated or explicitly accepted, if any]
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

Ask: **“Does this concrete experience accomplish the job simply? Anything missing, wrong, or padded?”** Resolve central interaction uncertainty proportionately before approval, or ask the user to explicitly accept the remaining uncertainty; do not hide it behind a plausible walkthrough. Revise until the user explicitly approves. Then update the parent's design without replacing its brief or stacking duplicate design sections, and read it back. Preserve the direction and commitments, not an obligation to keep every provisional mechanism.

Continue directly to slicing unless paused. If pausing, make this approved revision durable according to the shared tracking conventions.

## Phase B: vertical slices

A slice is a real, end-to-end capability that can be merged and shipped independently once its genuine prerequisites are present. It must let a user or operator do something they could not do before and must not rely on a later slice to become useful.

A schema-only, API-only, UI-only, repository-only, or test-only step is not a slice. Combine layers across repositories when needed until the result delivers observable value. One slice is valid when further splitting would create scaffolding or horizontal layers.

### Propose and order

Propose one to five small slices. For each state:

- a title phrased as the new capability;
- what it delivers and explicitly defers;
- the layers needed for that end-to-end path;
- two to four observable, slice-scoped acceptance criteria.

Identify technical risk and, for user-facing work, user-understanding risk using the approved walkthrough. Put the slice that tests the riskiest assumption first, not automatically the hardest engineering work, and state what it teaches. Address interaction uncertainty in the existing shaping or implementation review rather than postponing it solely because its code is easy.

Infer dependencies from the actual design and code: add a prerequisite only when the slice truly uses something delivered by it. Do not make every slice sequential by default. A dependent slice must still be independently shippable when its stated prerequisites are met.

### Approve together

Present the ordered slices, acceptance criteria, risk rationale, and dependency graph in one review. Ask the user to correct scope, order, dependencies, or criteria. This is one approval gate: revise all of them together until explicitly approved.

Check every approved slice:

- It delivers observable value across every layer it needs.
- It can ship without any later slice.
- Its criteria describe behavior, not implementation, and connect to the brief's observable outcomes; for user-facing work, map them to its part of the approved walkthrough.
- Its dependencies are real and point only to prerequisites. State what part of the whole job remains for later slices without making this slice depend on them for its own value.

### Save and hand off

Save each approved slice as an ordered child using the project's tracking conventions. Include its stable parent link, delivered behavior, deferrals, acceptance criteria, and explicit prerequisite links (or none). Reuse matching children on reruns and preserve unrelated content. Verify the parent and dependency links by reading them back.

Follow `tracking-conventions.md` to make the approved parent design and combined slice/criteria/dependency plan a durable baseline before production implementation or fan-out. Keep any retained disposable prototype clearly identified and separate from production; do not count it as a completed slice. Do not ship production code, push, or open a PR during shaping.

Report the parent and child references, durable revision evidence, dependency graph, and which slices currently have no pending prerequisites. If durability failed, report the block rather than authorizing implementation.

When the plan is durably saved, finish with: **“Run `/feature-implement <slice-ref>` for a ready slice.”**
