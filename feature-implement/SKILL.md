---
name: feature-implement
description: Implement ONE vertical slice of a feature end-to-end. Surveys codebase conventions, proposes a tactical plan, builds across every required layer, verifies acceptance criteria with tests, checks, and diff review, then updates the slice task. Use after feature-shape. Triggers include "implement this slice", "let's build this slice", "work on this slice ID", or an explicit /feature-implement invocation.
---

# /feature-implement — Build One Slice

Implement a single vertical slice end-to-end: data, server, client, and tests as required. The parent design supplies mandatory invariants, the slice description sets scope, and its acceptance criteria define the observable evidence of completion.

This is also where **tactical design** happens — the per-slice decisions that `/feature-shape` deliberately deferred (component structure, exact endpoint shape, file layout, UI specifics). Present the tactical plan before coding, but pause only when it contains a material choice or uncertainty.

## When to use

- User invokes `/feature-implement <slice-id>` (or just `/feature-implement` — then ask which slice).
- Operates on a single slice task created by `/feature-shape`. If the target is a parent feature task, redirect: pick one of its child slices, or run `/feature-shape` first.
- For tiny standalone changes (typo, dep bump, single-line config), skip the whole pipeline. This skill is for slices, not chores.

## What this skill does NOT do

- Implement multiple slices in the foreground. One slice per implementation agent; a coordinator may fan out separate one-slice invocations when the user explicitly requested parallel work.
- Silently adopt a new design. Questioning the interaction model is encouraged; if the recommendation changes agreed behavior or parent design, present it for a user decision and return to `/feature-shape` before implementing it.
- Re-slice. If the slice scope is wrong, stop and run `/feature-shape`.
- Open a PR or push branches. The user owns the publish step.
- Expand scope. "While I'm here let me also..." is the failure mode.

## Process

### 1. Setup

- Verify `backlog` CLI is available: `which backlog`. If missing, stop.
- Get the slice ID:
  - If passed as arg, use it.
  - Otherwise run `backlog task list --plain` and ask which slice to implement.
- Load context:
  - `backlog task view <slice-id> --plain` — read the slice description and acceptance criteria.
  - Find the parent ID from the slice description (the "Part of <parent-id>" line). Then `backlog task view <parent-id> --plain` to read the brief and `## Design` section.
- Check status. If the slice is already `Done`, ask whether to redo or stop. If it's `In Progress`, ask whether to resume.
- Establish a clean implementation baseline before changing status or code. If unrelated changes are present, use an isolated checkout/worktree or ask the user how to handle them. Never verify a slice against dirty code that will be excluded from its commit.
- Treat the artifacts as a hierarchy: the parent design and constraints are mandatory invariants; the slice description defines scope; the acceptance criteria are the observable evidence required for completion.
- **Gate the requested slice on its dependencies before doing any work:**
  - Read every dependency listed on the slice task and confirm it is `Done`.
  - Establish that each dependency's slice commit is reachable from the current `HEAD`, using the required slice ID in commit subjects (`git log --grep "<slice-id>"`) and `git merge-base --is-ancestor <sha> HEAD`. If commit identity is ambiguous, ask rather than guessing.
  - Read each direct dependency's `## Decisions` and `## Deferrals`; carry relevant context forward without treating tactical choices as new architecture.
  - If any dependency is incomplete, uncommitted, or not integrated into this checkout, stop and identify exactly what must land first.
- **Check for parallel fanout opportunities** without pausing:
  - List sibling slices: `backlog task list -p <parent-id> --plain`.
  - Identify other siblings that are *unblocked right now* — every dependency is `Done` and reachable from the integration `HEAD`, and the sibling itself is not yet `In Progress` or `Done`.
  - Continue with the requested foreground slice by default. Mention available fanout briefly, but do not turn it into a question or wait for an answer.
  - Fan out only when the user explicitly requested parallel work **and** the harness can provide isolated worktrees plus a coordinator that waits for every agent, collects its branch/commit, and integrates successful commits back into this checkout. Each background agent remains a separate one-slice `feature-implement` invocation, receives an explicit instruction not to fan out recursively, and must not push or open a PR.
  - Before fanout, require a clean integration checkout with the approved shape commit reachable. After agents finish, integrate commits in dependency order using the repository's merge/cherry-pick convention, stop on conflicts or failed agents, and rerun integration-relevant checks. A failed post-integration check blocks convergence even if individual slice tasks say `Done`; do not start a later dependency wave until prerequisites are integrated, reachable, and the integration checks pass.
  - If that convergence support is unavailable, do not fan out; explain briefly and continue only the requested foreground slice.
  - The runtime decision (parallel vs focused) lives here, not at slicing time.

### 2. Survey

Before writing code, survey the codebase for relevant patterns. Don't restate `AGENTS.md` — just internalize it.

- Find the closest existing analogue to what this slice does. Read it end-to-end so you follow its shape.
- Note conventions: where files live, naming, import paths, test structure, error handling, auth/permission patterns.
- For anything that takes more than ~3 reads/searches, delegate to an available exploration
  subagent rather than searching by hand. If delegation is unavailable, continue the survey
  directly.

If the slice involves a part of the codebase you've never touched in this conversation, the survey is mandatory — not optional.

### 3. Tactical plan

For UI slices, first seek a bounded `interaction-designer` consultation when available; otherwise reason through the experience directly. Supply the user's goal, parent brief/design, slice scope, known constraints, proposed flow, and relevant product references. Ask whether this is the right interaction model—not just how to style it—and request a concrete recommended flow with trade-offs. Separate genuine constraints from assumed screens, forms, and steps. The designer may challenge agreed choices, but adopting changes to behavior, scope, or parent design requires user approval and re-shaping where applicable. Do not repeatedly revisit a settled recommendation without new evidence.

Then write a short plan (a few sentences, not a doc):

- **Files** to create or edit.
- **Pattern** being followed — point to the existing example you surveyed.
- **Test strategy** — what gets unit-tested vs integration vs manual.
- **UI direction** — *for UI slices only:* state the user outcome, recommended interaction flow, and why it is simpler or more appropriate than the alternatives considered. Describe the primary action and hierarchy, grounded in the project's design language or a user-provided reference. Surface unresolved workflow decisions before coding; polish cannot fix the wrong interaction model.
- **Decisions to flag** — anywhere there's real choice or uncertainty.
- **Migration** — *only if this slice changes an existing schema or public contract.* State the approach: additive / expand→contract, the backfill plan for any new required field, and what stays compatible with old code and old data during rollout. A destructive change (drop / rename / narrow) must say why the old shape is safe to remove now, or defer that removal to a later slice. Omit this line entirely for brand-new tables/contracts.

Show the plan to the user, then proceed directly when it follows established patterns and flags no material decision. Pause for approval only when the plan contains genuine alternatives, scope uncertainty, behavior or contract changes not already settled, destructive migration work, or a new architectural convention. **This is the tactical design moment**, but presenting a routine plan is not itself a reason to block.

### 4. Implement

- Move slice to `In Progress`: `backlog task edit <slice-id> -s "In Progress" --plain`.
- Build the slice end-to-end across the layers it needs (data → server → client → tests). A slice without tests is not done — period.
- When suitable delegation is available and worthwhile, consider handing off clearly bounded,
  independent implementation work. Otherwise implement it directly. Keep unresolved product and
  architectural decisions in the foreground.
- Follow the project's conventions. Don't introduce new ones inline. If a convention is missing or wrong, surface it as a separate question; don't quietly invent one.
- Stay inside the slice's scope. If you discover work that belongs to a future slice or a different task, capture it (mention it to the user, or note it on the parent task) — don't silently expand.

### 5. Refine UI, then verify

#### UI refinement loop (UI slices only)

Treat the first functional UI as a draft. In-scope usability refinement is part of implementation, not scope creep.

**Aim for a considered product experience, not merely a usable implementation.** Make the main task obvious, give supporting information appropriate emphasis, and remove unnecessary choices, controls, and visual noise. Prefer the simplest coherent interaction while keeping required capabilities discoverable and accessible. Layout, typography, spacing, copy, and feedback should work together—not feel like separately assembled parts. Elegance means clarity and restraint, not extra decoration or fashionable styling.

Ask not only “What is broken or awkward?” but **“Does this feel deliberately designed around the user's task? What could we remove, combine, or simplify to make it feel inevitable?”** The target is a clear, cohesive experience, not merely passing functional criteria.

- **Inspect and use the running UI** in the browser with realistic, safely seeded content; screenshots or source review alone are insufficient. Cover relevant loading, empty, error, long-content, and narrow-viewport states, plus keyboard navigation and visible focus. Follow the browser safety and access rules below; unavailable access blocks completion.
- **Revisit the experience before polishing.** Prefer `interaction-designer`, or a suitably capable product-design partner; otherwise assess directly. Supply the user's goal, constraints, prior design recommendation, product reference, and rendered screenshot paths plus browser access where available (delegates do not inherit conversation images). Ask whether the working experience validates the interaction model or suggests a better flow; request a concrete recommendation with trade-offs before lower-level feedback. Treat the implementer's rationale as context, not proof. Separate observations from hypotheses and in-scope improvements from proposals needing approval; preserve what works and allow no changes when justified. A tester may collect evidence, but its verdict does not establish design quality. The implementer owns final decisions; focus follow-ups on the revised experience and reopen fundamental choices only when new evidence warrants it.
- **Fix the highest-impact in-scope issues** without asking for each adjustment that preserves agreed behavior and conventions. Ask before changing product behavior, scope, contracts, architecture, or design conventions; route fundamental workflow changes back to shaping.
- **Use up to three critique-and-refine passes.** End every changed pass with browser reinspection; stop early when no meaningful usability or visual-quality issues remain. If material issues remain at the budget limit, keep the slice `In Progress` and report the needed work or decision. Record minor remaining concerns as explicit deferrals.
- **Run final checks and diff review** against the refined implementation. Reuse browser evidence for unchanged UI; recheck affected flows after subsequent fixes.

#### Final verification

The acceptance criteria are the contract. For every AC, *actually verify* before checking it off — don't mark complete based on intent.

- Run project tests: `pnpm test` (or whatever the project uses — check `package.json` / `AGENTS.md`).
- Type check: `pnpm tc`.
- Lint: `pnpm lint`.
- **Review the slice diff.** Use the `code-review` skill on the changes this slice introduced
  when it is available. Otherwise, prefer suitable fresh-context review delegation when the
  harness provides it, or perform a focused, report-only bug and quality review directly. Default
  to one broad external review after the implementation has stabilized. If it finds material
  issues, use targeted re-reviews limited to those findings and their fixes;
  repeat only while material findings remain. After a clean review, inspect small follow-up
  changes directly unless they introduce a new correctness, security, or contract risk—do not
  rerun a broad review merely because the diff changed. Automatically fix unambiguous, in-scope
  correctness or quality findings and re-run the relevant checks. Ask the user only when a
  remedy changes scope, behavior, contracts, architecture, or conflicts with a later slice;
  capture later-slice work as a deferral. Keep review a gate, not a rewrite. This is the
  bug/quality lens only; the security pass runs once on the assembled feature in
  `feature-settle`, not per slice.
- **Migration safety** *(only if this slice has a migration).* Run the project's migration command up **and** down on a non-empty dataset (check `package.json` / `AGENTS.md` for the command). Confirm it's reversible — or the forward-only reason is recorded — the backfill populates correctly, and code from *before* this slice still works against the new schema (the compatibility window). If the project has no seed data, create a safe non-production fixture when possible. If no safe environment or dataset is available, report the exact blocked check and leave the affected AC and slice incomplete.
- For UI changes, automatically run browser verification for the happy path and obvious AC-linked edge cases. Prefer an available tester delegate for the bounded QA plan when suitable; otherwise use the available browser/testing capability directly. Ask first only before destructive or irreversible actions, actions against production or real user data, or external side effects such as purchases or sending messages. If verification requires credentials or access that are unavailable, ask for what is needed. Code-level checks (tests, types, lint) still run.
- Walk each AC explicitly. When an AC is met, mark it: `backlog task edit <slice-id> --check-ac <index> --plain`. ACs that depend on UI behavior stay unchecked until browser verification succeeds or the user completes a destructive check that required approval.

If an AC isn't met, fix the gap or surface why it can't be met — don't paper over it.

### 6. Update the task

Once verification is complete (ACs checked, including browser-verified UI behaviour where applicable), capture what actually happened. Keep the slice `In Progress` until the land step succeeds:

```bash
backlog task edit <slice-id> --plain --notes "$(cat <<'EOF'
## What was built
[1–3 sentences — what landed, which files]

## Decisions
- [Any non-obvious tactical decisions made during implementation]

## Deferrals
- [Things that came up but were correctly out of scope — recorded so they aren't lost — e.g. a deferred expand→contract step like "drop the old column in a later slice"]

## Friction (omit section entirely if none)
- [What made this awkward — data model, architecture, missing abstraction, code that fought you]
- [Brief reasoning — *why* awkward, not just *that* it was]
EOF
)"
```

The Friction section is **optional**, but important when something genuine was off — these notes are how parallel agents (and your future self) hand learnings to the later `/feature-settle` triage phase. Capture *raw observations*, not polished proposals. The human triages later.

What counts as friction worth capturing:

- Had to fight an existing pattern.
- Data model didn't fit the use case cleanly.
- Architecture forced a workaround.
- Couldn't find the right abstraction (or it didn't exist).
- Test setup was awkward in a way that suggests a missing helper.
- Type system pushed back unproductively.

What doesn't count: *"this was hard"*, normal bugs, tactical decisions you made and resolved. Capture only *systemic* friction — things a future implementer would also hit. **Omit the section entirely if nothing meets that bar** — that's the common case, and empty sections are noise.

Do not mark the slice `Done` yet. `Done` means its verified implementation and task record have landed in a commit, not merely that the code exists in a working tree.

### 7. Land and close (commit by default)

The default tail of this skill is to commit the slice. Running the skill is the opt-in; you don't need to ask again.

- **Follow the repository's branching convention.** Check `AGENTS.md`, contributor docs, and the user's explicit direction. If direct commits on the default branch are permitted, stay there; if branch/PR work is expected, create or use the appropriate branch. If unclear, ask rather than changing branches automatically.
- Ensure only this slice's implementation and backlog changes will be included; never sweep unrelated working-tree changes into the commit.
- Immediately before committing, set the slice to `Done`: `backlog task edit <slice-id> -s "Done" --plain`.
- Commit the code and the task's notes/status as one atomic unit. Follow project commit conventions and include the exact slice ID in the subject so later stages can identify the commit reliably.
- Confirm the commit succeeded and is reachable from the current `HEAD`. If it failed, restore the slice to `In Progress` and report the failure; never leave an unlanded slice marked `Done`.
- Stop at the commit. Do not push or open a PR unless explicitly requested.
- If the user says "don't commit this one," keep the task `In Progress` (or use `In Review` when the project has that status and the user prefers it). Report that it is verified but unlanded; dependent slices and `/feature-settle` remain blocked.

Report the commit SHA + subject in the hand-off. The exact slice ID in the subject is the durable mapping between the task and commit without requiring a self-referential SHA inside that same commit.

### 8. Hand off

- Summarize what was built (1–2 sentences) and report the commit (sha + subject), or note it was left uncommitted if the user skipped the land step.
- Surface anything the user should know: skipped ACs, deferrals, surprises.
- If the slice has UI, report the browser verification result, the key improvements from refinement, and any remaining UI concerns. If a required check remains pending because the action was destructive or access/capability was unavailable, leave its AC unchecked and the slice `In Progress` and uncommitted; say exactly what is needed to resume.
- Suggest the natural next step only after all required verification is complete **and the slice commit is integrated into the checkout that will host the next work**: *"Run `/feature-implement <next-slice-id>` for the next slice"*, or — if all sibling slice commits are integrated — *"this was the last slice; run `/feature-settle <parent-id>` to QA the assembled feature, triage friction, and close it out."*
- If a Friction section was captured, mention it carries into settle: *"Friction noted on the slice — `/feature-settle` will pick it up in its triage phase once the feature's done."*

## Anti-patterns

- ❌ Implementing without reading the parent invariants, slice scope, and acceptance criteria together.
- ❌ Implementing multiple slices in one invocation. One slice at a time.
- ❌ Skipping the survey. "I know how this codebase works" is how new conventions get introduced inline.
- ❌ Skipping the tactical plan because "the slice is small." Present it, then proceed unless it exposes a material decision.
- ❌ Going beyond the slice's scope. "While I'm here let me also..." is exactly what vertical slicing exists to prevent.
- ❌ Marking ACs done without actually verifying behavior.
- ❌ Treating a functional UI as finished without browser-based critique and refinement, or substituting decorative changes for fixing task friction.
- ❌ Skipping browser verification for UI changes. Run it automatically unless it would be destructive, irreversible, affect production/real user data, or cause an external side effect.
- ❌ Treating the chosen interaction model as unquestionable—or implementing a proposed redesign/re-slice without user approval and returning to the appropriate skill.
- ❌ Shipping a slice without tests because "it's hard to test." If a slice can't be tested, that's a tactical-plan problem to surface, not a corner to cut.
- ❌ Skipping the slice-diff review because tests and types pass. Tests prove it runs; review
  catches the off-by-one, inverted branch, or dead code that green tests sail past—different
  lens, both needed.
- ❌ Quietly inventing a new convention because the existing one didn't fit. Surface the mismatch.
- ❌ Shipping a destructive migration (drop / rename / narrow an existing column or contract) in the same slice the new code needs, with no compatibility window. Old code is still live during rollout — expand first, contract in a later slice.
- ❌ Marking a slice `Done` before its verified code and task record are committed, or leaving it `Done` after a failed/skipped commit.
- ❌ Starting a slice whose dependency commits are not reachable from the current checkout.
- ❌ Fanning out isolated worktrees without a named convergence path that collects and integrates their commits.
