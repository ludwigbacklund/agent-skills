---
name: feature-implement
description: Implement and verify one vertical feature slice. Use after feature-shape for requests such as "implement this slice" or an explicit /feature-implement invocation.
---

# /feature-implement — Build One Slice

Implement one slice end to end. The approved parent design supplies invariants, the slice supplies scope, and its acceptance criteria define completion.

## Boundaries

- Work on exactly one slice. If given a parent, ask for a child slice or direct the user to `/feature-shape`.
- Do not re-slice, silently change approved behavior, or absorb nearby work. Return material design or scope changes to the user and shaping.
- Do not push or open a PR unless explicitly requested.
- Parallel work is off by default. Only when the user explicitly opts in, read and follow `references/parallel-work.md`; do not perform automatic fanout discovery.

## 1. Establish the slice

- Read `../feature-spec/references/tracking-conventions.md` and follow the project's tracking conventions.
- Resolve the stable slice reference, or list likely slices and ask.
- Read together:
  - the slice scope and acceptance criteria;
  - the parent brief and approved design;
  - dependencies and their relevant decisions or deferrals.
- Require a durable approved planning baseline as defined by the shared reference. Stop if it is absent.
- Confirm every dependency is complete **and** its mapped implementation revision is an ancestor of current `HEAD`. Status alone is insufficient; ambiguous or unreachable evidence blocks work.
- Follow repository instructions and branching conventions. Start from an appropriate clean baseline; isolate unrelated changes or ask how to proceed.
- If the slice is already complete, ask whether to stop or redo it. If it is in progress, ask whether to resume.

## 2. Survey and plan

- Read the closest relevant implementation and test analogue. Note file layout, naming, errors, authorization, and test patterns; do not invent a new convention silently.
- For UI work, seek a bounded interaction-design consultation when available. Give it the user goal, approved design, slice constraints, proposed flow, and product references. Ask whether the interaction model is right, not merely how to style it. Behavior or scope changes still require user approval and, when needed, reshaping.
Present a brief tactical plan:

- files to create or change;
- the analogue and pattern being followed;
- unit, integration, browser, and manual test strategy as applicable;
- for UI, the intended outcome and interaction flow;
- for changed schemas or public contracts, compatibility, backfill, and expand→contract handling;
- any genuine unresolved choice.

Proceed immediately when the plan follows established patterns. Pause only for a material product, scope, contract, migration, or architecture choice.

## 3. Implement

- Move the slice to the mapped in-progress state.
- Build only the required vertical path across data, server, client, and tests. Tests are required.
- Preserve authorization, validation, error handling, accessibility, and rollout compatibility implied by the design and repository conventions.
- Record out-of-scope discoveries as deferrals rather than expanding the slice.
- For UI, treat the first working version as a draft. Use the running interface with realistic safe data.
- Refine hierarchy, copy, feedback, responsiveness, keyboard use, and loading/empty/error states. Reconsult interaction design when available if rendered evidence challenges the flow.
- Make in-scope improvements directly; seek approval for changed behavior or conventions. Use at most three critique/refinement passes, stopping early when no meaningful issue remains.

## 4. Verify

- Verify every acceptance criterion with retained evidence; intent is not evidence.
- Run the repository's relevant tests, type checks, lint/format checks, and any build or generated-code checks required by project instructions.
- For migrations, test the ordered up/down or documented forward-only path on non-empty safe data, verify backfill and the compatibility window, and report unavailable safe environments as blockers.
- For UI, verify the happy path and AC-linked edge states in a browser after refinement. Source review or screenshots alone are insufficient. Ask before destructive, irreversible, production, real-user-data, or external-side-effect actions. Missing access leaves affected criteria incomplete.
- Obtain an independent, report-only correctness and quality review of this slice's diff using the code-review capability when available, otherwise fresh-context review or a focused direct review. Fix unambiguous in-scope findings, rerun affected checks, and re-review material fixes against the original findings; escalate material choices. Security of the assembled feature is reviewed in `/feature-settle`.
- Inspect the final diff for scope and unrelated files. Any failed, blocked, or stale required check prevents completion.

## 5. Record and land

Update the mapped slice record with:

- **What was built:** a short result and verification evidence.
- **Decisions:** only non-obvious choices future work needs.
- **Deferrals:** concrete out-of-scope work that should survive.
- **Friction:** only systemic obstacles useful to a later implementer.

Omit empty or routine sections. Do not turn normal debugging history into durable notes.

Commit and update completion using the shared tracking rules. Report any blocked checks, uncommitted work, or failed tracker updates instead of claiming success.

## 6. Hand off

Report:

- what was built;
- checks and browser evidence, where applicable;
- the implementation revision and tracker synchronization result, or that work remains uncommitted;
- blockers, deferrals, and useful friction.

Suggest another slice or `/feature-settle` only when this slice is truthfully complete, its revision is integrated into the checkout that will host subsequent work, and all required evidence is durable.
