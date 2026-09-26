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
- Confirm every dependency is complete **and** every mapped implementation revision is present in the corresponding repository baseline. Status alone is insufficient; ambiguous or unreachable evidence blocks work.
- Resolve the Git roots needed for the slice. Use the normal single-worktree flow for one repository. For several, use one clean checkout or worktree per repository and keep one combined revision set; in Orca, group them under one folder context when practical.
- Follow each repository's instructions and branching conventions. Start from appropriate clean baselines; isolate unrelated changes or ask how to proceed.
- If the slice is already complete, ask whether to stop or redo it. If it is in progress, ask whether to resume.

## 2. Survey and plan

- Read the closest relevant implementation and test analogue. Note file layout, naming, errors, authorization, and test patterns; do not invent a new convention silently.
- For UI work, challenge the interaction before choosing controls, using the approved user journey when present. Minimize total user effort and uncertainty, not code, clicks, or controls alone. Start from the user's goal rather than exposing data-model operations; remove unnecessary concepts, actions, and demands on memory without hiding useful information.
- For each user-facing choice, explain why the user must make it now; otherwise use a safe default or defer it while preserving meaningful control, discoverability, accessibility, and reversibility. Match input precision to the decision. Present information when it helps the user decide, understand consequences, or recover, using their language rather than internal machinery. Consider how users undo or change a decision without adding a mode for every mutation.
- Seek a bounded interaction-design consultation when available; otherwise perform this critique directly. Give it the user goal, approved design, slice constraints, proposed flow, and product references. Ask what can be removed or deferred, not merely how to label or style it. Behavior or scope changes still require user approval and, when needed, reshaping.

Present a brief tactical plan:

- affected repositories, when there is more than one;
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
- For UI, treat the first working version as a draft. Use the running interface with realistic safe data. Before completion, obtain independent critique of the rendered happy path and critical failure/recovery states—not just the proposed flow or source. The initial interaction consultation does not satisfy this review.
- Give the reviewer the user's goal, approved journey, project design principles, and running interface, not only implementation acceptance criteria. Assess visual hierarchy, density and grouping, scanning/comparison, timely consequences, and the next useful action at realistic container widths and content lengths. Exercise recovery: can users finish the job without unnecessary navigation, repeated entry, or reconstructing their work? Check keyboard use and relevant loading/empty/error states. Absence of overflow is not evidence of good responsive design.
- Make in-scope improvements directly; seek approval for changed behavior or conventions. Use at most three critique/refinement passes, stopping early when no meaningful issue remains. If material experience findings remain at the limit, stop and report the blocker rather than marking the slice complete. This rendered review supplies the experience verdict in step 4; it is not an extra user-approval stage.

## 4. Verify

- Verify every acceptance criterion with retained evidence; intent is not evidence.
- Run each affected repository's relevant tests, type checks, lint/format checks, and any build or generated-code checks required by its project instructions.
- For migrations, test the ordered up/down or documented forward-only path on non-empty safe data, verify backfill and the compatibility window, and report unavailable safe environments as blockers.
- For UI, verify the happy path and AC-linked edge states in a browser after refinement. Check whether the current state, next action, and consequences are understandable without implementation knowledge—not merely whether controls work. Exercise invalid input before submission: feedback must arrive when useful, and invalid values must not produce a valid-looking consequence preview. Check realistic container widths and content, not only viewport breakpoints. Source review or screenshots alone are insufficient. Ask before destructive, irreversible, production, real-user-data, or external-side-effect actions. Missing access leaves affected criteria incomplete.
- Obtain an independent, report-only correctness and quality review of this slice's diff using the code-review capability when available, otherwise fresh-context review or a focused direct review. Any spawned reviewer must use the same agent harness as the current session; never invoke a different harness as a fallback. Fix unambiguous in-scope findings, rerun affected checks, and re-review material fixes against the original findings; escalate material choices. Security of the assembled feature is reviewed in `/feature-settle`.
- For UI, require a distinct **experience verdict** from an independent reviewer who has inspected the rendered interface and exercised the critical journey, including recovery. The same reviewer may cover code and experience if equipped for both, but record the verdicts separately. Use the same-harness rule above for spawned reviewers. If independent review or browser access is unavailable, report this gate as blocked; self-review is not a substitute.
- Material experience findings block completion even when tests and functional browser checks pass. These include unclear state or next action, misleading consequences, avoidable recovery burden, and hierarchy or density that materially impedes the task. Fix and independently re-review affected states on the final implementation; do not defer an in-scope blocker to `/feature-settle` or label it cosmetic. Screenshots alone, a generic “browser QA passed,” and correctness approval cannot establish an experience pass.
- Inspect the final diff in every affected repository for scope and unrelated files. Any failed, blocked, or stale required check prevents completion.

## 5. Record and land

Update the mapped slice record with:

- **What was built:** a short result and verification evidence.
- **UI experience review, when applicable:** reviewer identity, tested implementation revision or exact working-tree state, rendered states and widths reviewed, recovery paths exercised, material findings and their verified resolutions, and the final experience verdict with any remaining limitations. Retain representative visual evidence alongside the behavioral observations. Unresolved material findings or a missing, blocked, or stale verdict prevent Done status.
- **Decisions:** only non-obvious choices future work needs.
- **Deferrals:** concrete out-of-scope work that should survive.
- **Friction:** only systemic obstacles useful to a later implementer.

Omit empty or routine sections. Do not turn normal debugging history into durable notes.

Commit each affected repository and update completion using the shared tracking rules. Record the repository-to-revision map when there is more than one. Report any blocked checks, uncommitted work, or failed tracker updates instead of claiming success.

## 6. Hand off

Report:

- what was built;
- checks and browser evidence, where applicable;
- the implementation revision set and tracker synchronization result, or that work remains uncommitted;
- blockers, deferrals, and useful friction.

Suggest another slice or `/feature-settle` only when this slice is truthfully complete, its revision is integrated into the checkout that will host subsequent work, and all required evidence is durable.
