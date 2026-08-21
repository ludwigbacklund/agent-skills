---
name: feature-implement
description: Implement ONE vertical slice of a feature end-to-end. Surveys codebase conventions, proposes a tactical plan, builds across every required layer, verifies acceptance criteria with tests, checks, and diff review, then updates the slice task. Use after feature-shape. Triggers include "implement this slice", "let's build this slice", "work on this slice ID", or an explicit /feature-implement invocation.
---

# /feature-implement — Build One Slice

Implement a single vertical slice end-to-end: data, server, client, and tests as the slice requires. The slice's acceptance criteria are the spec — when they're met and verified, the slice is done.

This is also where **tactical design** happens — the per-slice decisions that `/feature-shape` deliberately deferred (component structure, exact endpoint shape, file layout, UI specifics). Tactical alignment with the user happens before any code is written.

## When to use

- User invokes `/feature-implement <slice-id>` (or just `/feature-implement` — then ask which slice).
- Operates on a single slice task created by `/feature-shape`. If the target is a parent feature task, redirect: pick one of its child slices, or run `/feature-shape` first.
- For tiny standalone changes (typo, dep bump, single-line config), skip the whole pipeline. This skill is for slices, not chores.

## What this skill does NOT do

- Implement multiple slices in one invocation. One slice at a time.
- Re-design. If the design is wrong, stop and run `/feature-shape`.
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
- Treat the **acceptance criteria as the spec**. Anything they cover must be built and verified. Anything they don't cover is out of scope for this slice.
- **Check for parallel fanout opportunities** (runtime decision):
  - List sibling slices: `backlog task list -p <parent-id> --plain`.
  - Identify other siblings that are *unblocked right now* — every dependency is `Done`, and the sibling itself is not yet `In Progress` or `Done`.
  - If any exist, offer:
    > "Slices X, Y are also unblocked right now. Fan them out in parallel worktrees, or focus here?"
  - Default is focus here — fanout is opt-in.
  - On opt-in, use the harness's available subagent mechanism to run one background agent per
    other unblocked sibling in an isolated worktree. Point each agent to this skill by name
    (`feature-implement`) and its specific slice ID—build, test, and verify against ACs, but do
    not push or open PRs. If isolated background delegation is unavailable, explain that and
    continue sequentially. Continue the foreground slice yourself.
  - The runtime decision (parallel vs sequential) lives here, not at slicing time.

### 2. Survey

Before writing code, survey the codebase for relevant patterns. Don't restate `AGENTS.md` — just internalize it.

- Find the closest existing analogue to what this slice does. Read it end-to-end so you follow its shape.
- Note conventions: where files live, naming, import paths, test structure, error handling, auth/permission patterns.
- For anything that takes more than ~3 reads/searches, delegate to an available exploration
  subagent rather than searching by hand. If delegation is unavailable, continue the survey
  directly.

If the slice involves a part of the codebase you've never touched in this conversation, the survey is mandatory — not optional.

### 3. Tactical plan

Write a short plan (a few sentences, not a doc):

- **Files** to create or edit.
- **Pattern** being followed — point to the existing example you surveyed.
- **Test strategy** — what gets unit-tested vs integration vs manual.
- **Decisions to flag** — anywhere there's real choice or uncertainty.
- **Migration** — *only if this slice changes an existing schema or public contract.* State the approach: additive / expand→contract, the backfill plan for any new required field, and what stays compatible with old code and old data during rollout. A destructive change (drop / rename / narrow) must say why the old shape is safe to remove now, or defer that removal to a later slice. Omit this line entirely for brand-new tables/contracts.

Show the plan to the user. Wait for approval. Iterate if they want a different shape. **This is the tactical design moment** — the user's last cheap chance to redirect before code lands. Don't skip it just because the slice is small.

### 4. Implement

- Move slice to `In Progress`: `backlog task edit <slice-id> -s "In Progress" --plain`.
- Build the slice end-to-end across the layers it needs (data → server → client → tests). A slice without tests is not done — period.
- Follow the project's conventions. Don't introduce new ones inline. If a convention is missing or wrong, surface it as a separate question; don't quietly invent one.
- Stay inside the slice's scope. If you discover work that belongs to a future slice or a different task, capture it (mention it to the user, or note it on the parent task) — don't silently expand.

### 5. Verify

The acceptance criteria are the contract. For every AC, *actually verify* before checking it off — don't mark complete based on intent.

- Run project tests: `pnpm test` (or whatever the project uses — check `package.json` / `AGENTS.md`).
- Type check: `pnpm tc`.
- Lint: `pnpm lint`.
- **Review the slice diff.** Use the `code-review` skill on the changes this slice introduced
  when it is available. Otherwise perform a focused, report-only bug and quality review of the
  slice diff. Default to one broad external review after the implementation has stabilized. If
  it finds material issues, use targeted re-reviews limited to those findings and their fixes;
  repeat only while material findings remain. After a clean review, inspect small follow-up
  changes directly unless they introduce a new correctness, security, or contract risk—do not
  rerun a broad review merely because the diff changed. Surface findings and triage them *with
  the user*: fix what's real and in scope now; capture later-slice work as a deferral. Keep it a
  gate, not a rewrite—do not auto-apply fixes or expand scope. This is the bug/quality lens
  only; the security pass runs once on the assembled feature in `feature-settle`, not per
  slice.
- **Migration safety** *(only if this slice has a migration).* Run the project's migration command up **and** down on a non-empty dataset (check `package.json` / `AGENTS.md` for the command). Confirm it's reversible — or the forward-only reason is recorded — the backfill populates correctly, and code from *before* this slice still works against the new schema (the compatibility window). If the project has no seed data, treat the down/backfill check as a hand-off like UI verification: say what you'd exercise and let the user run it.
- For UI changes: **do not auto-drive the browser**. Pause and hand off — say what you'd exercise (happy path + the obvious edge cases tied to the ACs) and let the user choose: drive it themselves, or ask you to run the `agent-browser` skill. Code-level checks (tests, types, lint) still run; only UI verification waits.
- Walk each AC explicitly. When an AC is met, mark it: `backlog task edit <slice-id> --check-ac <index> --plain`. ACs that depend on UI behavior stay unchecked until verified — by the user or by an explicit agent-browser run they requested.

If an AC isn't met, fix the gap or surface why it can't be met — don't paper over it.

### 6. Update the task and close it out

Once verification is complete (ACs checked, user has confirmed any UI behaviour), capture what actually happened and flip the slice to `Done` in the same step — don't leave it lingering in `In Progress`:

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

After notes are written, flip the slice: `backlog task edit <slice-id> -s "Done" --plain`. This is the closeout step — without it, `Done` slices silently pile up in `In Progress` and the board lies about what's left. If the project uses an `In Review` status and the user prefers that for unmerged work, ask; otherwise default to `Done`.

### 7. Land (commit by default)

A slice marked `Done` but left uncommitted is a lie waiting to happen — the next slice builds on top of an uncommitted working tree and the history blurs. So the default tail of this skill is to **commit the slice**. Running this skill is the opt-in; you don't need to ask again.

- **Commit the slice as one atomic unit** — the code *and* the ticket changes from step 6 (the implementation notes and the `Done` flip). One slice = one commit, so a later `/feature-settle` can read a clean per-slice history.
- **Branch first if you're on the default branch.** Never commit a slice straight onto `main`/`master` — create a feature branch first (per the repo's branching convention).
- **Message follows the project's commit conventions** (subject style, any required trailer). Reference the slice in the subject so the commit maps back to the ticket.
- **Stop at the commit.** Do not push and do not open a PR unless the user explicitly asks — publishing the branch stays the user's call.
- **Skippable.** If the user says "don't commit this one," leave the slice built-and-`Done` in the working tree, same as before.

Report the commit (sha + subject) in the hand-off.

### 8. Hand off

- Summarize what was built (1–2 sentences) and report the commit (sha + subject), or note it was left uncommitted if the user skipped the land step.
- Surface anything the user should know: skipped ACs, deferrals, surprises.
- If the slice has UI: **explicitly note that browser verification is still pending** and offer to run `agent-browser` if they'd like — don't assume.
- Suggest the natural next step: *"Run `/feature-implement <next-slice-id>` for the next slice"*, or — if all sibling slices are done — *"this was the last slice; run `/feature-settle <parent-id>` to QA the assembled feature, triage friction, and close it out."* — but only after the user has verified the UI (or declined to).
- If a Friction section was captured, mention it carries into settle: *"Friction noted on the slice — `/feature-settle` will pick it up in its triage phase once the feature's done."*

## Anti-patterns

- ❌ Implementing without reading the slice's acceptance criteria. They are the spec.
- ❌ Implementing multiple slices in one invocation. One slice at a time.
- ❌ Skipping the survey. "I know how this codebase works" is how new conventions get introduced inline.
- ❌ Skipping the tactical plan because "the slice is small." Small slices still earn the alignment moment.
- ❌ Going beyond the slice's scope. "While I'm here let me also..." is exactly what vertical slicing exists to prevent.
- ❌ Marking ACs done without actually verifying behavior.
- ❌ Auto-driving the browser to "verify" UI changes. Browser verification is the user's call — pause and offer, don't assume.
- ❌ Re-designing or re-slicing inside this skill. If you find yourself doing either, stop and back up to the right skill.
- ❌ Shipping a slice without tests because "it's hard to test." If a slice can't be tested, that's a tactical-plan problem to surface, not a corner to cut.
- ❌ Skipping the slice-diff review because tests and types pass. Tests prove it runs; review
  catches the off-by-one, inverted branch, or dead code that green tests sail past—different
  lens, both needed.
- ❌ Quietly inventing a new convention because the existing one didn't fit. Surface the mismatch.
- ❌ Shipping a destructive migration (drop / rename / narrow an existing column or contract) in the same slice the new code needs, with no compatibility window. Old code is still live during rollout — expand first, contract in a later slice.
- ❌ Leaving the slice in `In Progress` after notes are written. The closeout flip to `Done` is part of step 6, not something to defer "until later".
