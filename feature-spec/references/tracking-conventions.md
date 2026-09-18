# Shared tracking and completion rules

Read at the start of each feature skill. Install the four feature skills together; they share this file.

## Follow the project

Use the tracker and tools named in project instructions or established by existing work—Backlog, hosted issues, or ordinary repository documents all work. Ask if the choice is unclear or none exists; don't introduce or migrate a tracker silently. Use tool help rather than inventing commands. Missing access blocks the affected step.

Reuse the project's conventions. Record only missing decisions that later agents need, in existing workflow docs or the parent feature; no new configuration document or exhaustive mapping is required.

Keep a durable trail: parent brief and approved design → ordered slices with scope, criteria, dependencies, and status → implementation evidence → final QA and follow-ups. Use native fields when available; otherwise stable links, sections, and checklists suffice. A slice can be a document section, not necessarily a separate issue. Use project status names; “Done” here means successfully completed, not cancelled.

Treat implementation evidence as a revision set keyed by repository. A single-repository task may use one revision as shorthand. When a slice spans repositories, keep it vertical: use one clean checkout or worktree per repository, record every required revision, and do not turn repository layers into feature slices. In Orca, group those worktrees under one folder context when practical.

Read before editing, preserve unrelated content, and confirm saves. Reuse existing work on reruns. After a failed create, check whether it succeeded before retrying; don't duplicate issues or overwrite concurrent changes.

Prefer one canonical, evolving record over commentary about that record. Update the existing issue body, backlog document, or repository file in place as the feature progresses. Use comments only for actual discussion, questions, blockers, or requested notifications—not routine snapshots, progress logs, status changes, or evidence that belongs in the canonical record.

## Save approved plans

Before implementation, preserve the approved brief, design, slice criteria, and dependency graph so later agents can retrieve the same plan:

- **Repository files:** selectively commit changed planning files and give implementation worktrees that commit.
- **Hosted records:** update the canonical body, mark the approved plan revision and date when the format permits, and rely on the tracker's native history. If it has no usable revision history, follow the project's durable document convention or ask where approval should be preserved. Do not add a comment solely to snapshot the body.
- **Both:** save each part appropriately and link them, without creating competing sources of truth.

Report the saved reference. If saving/committing fails or the user declines the required commit, report the blocker rather than starting implementation. Material plan changes need renewed approval. Give delegates the parent, slice, and approved-plan references.

## Finish truthfully

Follow project branch/commit conventions; ask when unclear. Commit verified work by default, including only changes from this task. Never push or open a PR without explicit permission. If the user declines a commit or required verification is blocked, keep the task open and say what remains.

- **Local task files:** commit verified code and completion notes/status together. If the commit fails, restore the task's open state and report failure.
- **Remote tasks:** commit verified code first, then save evidence and the implementation revision, and mark complete last. Read back to confirm. On failure, report “code committed; tracker update pending,” keep completion blocked, and retry only missing updates after checking current state. Leave or restore the task to an open state when possible; don't undo a concurrent user's changes.
- Respect project merge/publication requirements: retain an intermediate state if those gates aren't met. A local commit doesn't override them.

Record each implementation commit that belongs to a slice, keyed by repository when there is more than one, through tracker links or commit subjects containing its stable reference. Local completion metadata can be identified by the commit containing it; don't try to embed a commit's own SHA in itself. Before building on a dependency or settling the feature, confirm its completed state **and** verify every recorded revision in the corresponding checkout (`git merge-base --is-ancestor <revision> HEAD`). After squash/rebase/cherry-pick, verify the integrated equivalent; ask if ambiguous. Status or a metadata-only commit is not implementation evidence.

Apply the same save/read-back rules to QA and follow-ups. Close the parent only after required evidence and approved follow-ups are saved. Commit local settlement metadata selectively; for remote records, close last. Failed saves never count as successful completion.

## Reuse QA only when still valid

Save the tested code revision set and the plan it was checked against. Reuse a verdict only if behavior and requirements are unchanged: inspect committed, staged, unstaged, and untracked changes in every affected checkout, plus scope/design/criteria changes in the tracker. Pure tracking bookkeeping may be ignored, but never exclude a whole tracker directory without checking that it contains no behavior-affecting files. If evidence is missing, ambiguous, or stale, verify again.
