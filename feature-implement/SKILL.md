---
name: feature-implement
description: Implement and verify one vertical feature slice. Use after feature-shape for requests such as "implement this slice" or an explicit /feature-implement invocation.
---

# /feature-implement — Build One Slice

Implement one slice end to end. The approved parent supplies the user's job and commitments; the slice supplies scope. Deliver its part of the concrete experience and verify its criteria, rather than merely reproducing planned mechanisms.

## Boundaries

- Work on exactly one slice. If given a parent, ask for a child slice or direct the user to `/feature-shape`.
- Do not re-slice, silently change committed behavior, or absorb nearby work. Simplify provisional interaction choices when commitments and meaningful control are preserved. Return material changes to the user and shaping with evidence and a concrete alternative; approval is not evidence that the interaction is good.
- Do not push or open a PR unless explicitly requested.
- Parallel work is off by default. Only when the user explicitly opts in, read and follow `references/parallel-work.md`; do not perform automatic fanout discovery.

## 1. Establish the slice

- Read `../feature-spec/references/tracking-conventions.md` and follow the project's tracking conventions.
- Resolve the stable slice reference, or list likely slices and ask.
- Read together:
  - the slice scope and acceptance criteria;
  - the parent brief and approved design, including the primary scenario and walkthrough for user-facing work;
  - dependencies and their relevant decisions or deferrals.
- Require a durable approved planning baseline as defined by the shared reference. Stop if it is absent.
- Confirm every dependency is complete **and** every mapped implementation revision is present in the corresponding repository baseline. Status alone is insufficient; ambiguous or unreachable evidence blocks work.
- Resolve the Git roots needed for the slice. Use the normal single-worktree flow for one repository. For several, use one clean checkout or worktree per repository and keep one combined revision set; in Orca, group them under one folder context when practical.
- Follow each repository's instructions and branching conventions. Start from appropriate clean baselines; isolate unrelated changes or ask how to proceed.
- If the slice is already complete, ask whether to stop or redo it. If it is in progress, ask whether to resume.

## 2. Survey and plan

- Read the closest relevant implementation and test analogue. Note file layout, naming, errors, authorization, and test patterns; do not invent a new convention silently.
- For UI, use the approved concrete journey and any shaping prototype to challenge the interaction before choosing controls. If the primary scenario is missing, resolve that gap through shaping without restarting unrelated planning. Minimize user effort and uncertainty; keep system guarantees underneath rather than exposing data-model operations.
- Reconsider any implementation choice that adds something the person must understand, decide, remember, or navigate. A version selector or persistent warning is not automatically incidental because it maps to a backend distinction. Prefer safe defaults and timely disclosure without hiding consequential information or weakening accessibility and control.
- Seek interaction-design help only for a concrete uncertainty. Follow the shared consultation guidance; preserve alternatives and trade-offs, and remain responsible for the choice. No prescribed sequence of expert approvals is required.

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
- For UI, treat the first working version as a draft and use it with realistic safe data. Review the job before the checklist: can the person find what needs attention, understand the evidence, make the intended decision, and recognize completion? Then exercise controls and important recovery states. Inspect hierarchy, comparison, keyboard use, and realistic narrow layouts/content; absence of overflow does not establish usability.
- Use focused independent interaction critique when available and useful for a concrete uncertainty, not as a certificate required for every slice. Otherwise investigate directly in the browser and report the limits. Give any reviewer the job and genuine constraints before the implementation rationale; ask what work the interface unnecessarily imposes, not only whether named polish findings are fixed. The coordinator still owns the judgment and must resolve or escalate remaining central uncertainty.
- Fix in-scope implementation and provisional-design problems directly. Return material commitment or scope changes to shaping with evidence and a concrete alternative. Do not classify a design blocker as cosmetic or later-slice work merely to finish. Recheck affected behavior after changes; if the model remains wrong, stop and escalate rather than repeatedly polishing it.
- Provide a way to inspect the result. Screenshots or a compact experience packet are optional when they help explain the journey or a decision; if used, follow `references/experience-packet.md`. Capture them during existing checks, not a separate presentation phase.

## 4. Verify

- Verify every acceptance criterion with retained evidence; intent is not evidence.
- Run each affected repository's relevant tests, type checks, lint/format checks, and any build or generated-code checks required by its project instructions.
- For migrations, test the ordered up/down or documented forward-only path on non-empty safe data, verify backfill and the compatibility window, and report unavailable safe environments as blockers.
- For UI, verify the happy path and AC-linked edge states in a browser after refinement. Check whether the current state, next action, and consequences are understandable without implementation knowledge—not merely whether controls work. Exercise invalid input before submission: feedback must arrive when useful, and invalid values must not produce a valid-looking consequence preview. Check realistic container widths and content, not only viewport breakpoints. Source review or screenshots alone are insufficient. Ask before destructive, irreversible, production, real-user-data, or external-side-effect actions. Missing access leaves affected criteria incomplete.
- Obtain an independent, report-only correctness and quality review of this slice's diff using the code-review capability when available, otherwise fresh-context review or a focused direct review. Any spawned reviewer must use the same agent harness as the current session; never invoke a different harness as a fallback. Fix unambiguous in-scope findings, rerun affected checks, and re-review material fixes against the original findings; escalate material choices. Security of the assembled feature is reviewed in `/feature-settle`.
- For UI, record **verified behavior**, **observed experience findings**, and **unresolved uncertainty** separately, following the shared evidence rules. Name the portion of the original job exercised and what remains across slices; do not issue a blanket interaction PASS. Browser access remains required for affected UI verification. Apply the same-harness rule to any spawned interaction reviewer too.
- Material experience findings block completion even when tests pass: unclear next actions, misleading consequences, avoidable recovery burden, or hierarchy/density that impedes the task. Fix and recheck affected states; do not defer an in-scope blocker to settlement. Investigate central discovery/completion uncertainty or obtain explicit user acceptance of the uncertainty before affected completion; do not treat it as harmless merely because it is labeled a hypothesis.
- Inspect the final diff in every affected repository for scope and unrelated files. Any failed, blocked, or stale required check prevents completion.

## 5. Record and land

Update the mapped slice record with:

- **What was built:** a short result and verification evidence.
- **UI experience, when applicable:** the job exercised, relevant layout/recovery coverage, observed findings and resolutions, remaining uncertainty, and a way to inspect the result. Distinguish expert inspection from actual-user testing. Link optional screenshots/packet and detailed checks instead of duplicating them. Record the tested revision under the shared freshness rules; no separate certificate, packet, or additional working-tree hash is required.
- **Decisions:** only non-obvious choices future work needs. Reconcile superseded parent guidance and carry approved reusable lessons into their canonical owner, as required by the shared tracking rules.
- **Deferrals:** concrete out-of-scope work that should survive.
- **Friction:** only systemic obstacles useful to a later implementer.

Omit empty or routine sections. Do not turn normal debugging history into durable notes.

Commit each affected repository and update completion using the shared tracking rules. Record the repository-to-revision map when there is more than one. Report any blocked checks, uncommitted work, or failed tracker updates instead of claiming success.

## 6. Hand off

Report:

- what was built;
- for UI, how to try or inspect the result, the job exercised, and meaningful limitations or decisions needing the user's judgment; link a packet only if one was useful;
- checks and browser evidence, where applicable;
- the implementation revision set and tracker synchronization result, or that work remains uncommitted;
- blockers, deferrals, and useful friction.

Do not add a general approval gate or wait for routine feedback before landing; pause for blockers, material decisions, or central uncertainty requiring explicit acceptance under the existing rules. If blocked, show the available result and what remains unresolved.

Suggest another slice or `/feature-settle` only when this slice is truthfully complete, its revision is integrated into the checkout that will host subsequent work, and all required evidence is durable.
