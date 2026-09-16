# Shared feature tracking conventions

Read this reference at the start of every feature skill. It defines storage and synchronization, not a new tracker. The four feature skills preserve the same brief → approved design → slices → verified implementation → QA/triage trail regardless of backend. Install these four skills together; the other three reference this file.

## Resolve once, reuse across phases

1. Read project instructions (`AGENTS.md` and linked guidance), existing feature/task artifacts, and available tracking integrations. Prefer the project's declared source of truth, not whichever CLI happens to be installed. An existing task reference helps identify its backend but does not authorize migrating it.
2. Reuse an existing tracking mapping. If multiple systems have different roles, identify the authoritative location for each artifact. If conventions conflict, the backend is ambiguous, or the project has no tracker, ask once before creating anything. Offer the project's existing document/checklist convention where appropriate; do not initialize Backlog or introduce a second tracker silently.
3. Check tool access and supported operations using the integration's instructions/help. Use the available CLI, MCP, API, or repository files; do not invent commands. Missing access blocks affected operations—do not silently fall back to another store or claim a write succeeded.
4. Persist the mapping in the project's established workflow documentation, or a clearly labeled `Tracking conventions` section on the parent feature. With no established location, agree on one with the user. Resolve it before writes; when creating the first parent, include the mapping there. Pass its location and stable parent reference to every delegated agent. Later phases load it rather than independently guessing.

A concise mapping must identify:

- **Source of truth and access:** backend/project, authoritative artifact locations, tools, and mapping location.
- **References:** stable parent/slice references (ID, URL, or repository path plus anchor), how to list children, and how dependencies are represented.
- **Lifecycle:** equivalents of not started, in progress, complete, and reopened; what cancelled/out-of-scope means. Skill labels such as `Done` are semantic, not literal status strings. Never equate cancelled with successfully implemented.
- **Content:** brief, approved design, slice scope, individually identifiable acceptance criteria and completion evidence, decisions, deferrals, friction, QA verdict/tested revision, and triage disposition locations.
- **Follow-ups:** where approved drafts/deferred items live and how they become actionable work.
- **Durability:** Git-local or remote/mixed storage, approved planning baseline location/version, implementation revision links, and exact metadata-only repository paths (empty when all tracking is remote).

## Equivalent representations

Use native fields when available. Otherwise use clearly labeled sections, explicit stable links, and checklists in the existing artifacts:

| Workflow concept | Without a native field |
| --- | --- |
| Parent and children | Parent maintains ordered slice links; each slice links back to parent |
| Dependency | Slice lists stable prerequisite references; parent records the approved graph |
| Acceptance criteria | Individually identifiable checklist entries with verification evidence; match by identity/text, not a stale list index |
| Decisions, deferrals, friction | Labeled sections or linked records readable by later phases |
| Draft/follow-up | Project's deferred-work document, draft issue, or explicitly deferred task, linked to its originating feature |
| QA | Record verdict, checks/findings, tested code revision, security outcome, and dispositions together |

A slice may be a section in one document rather than a separate issue, provided it has a stable reference, scope, criteria, dependencies, and lifecycle. Do not manufacture tracker entities merely to mimic Backlog. Missing native features are acceptable; missing information or unverifiable gates are not.

Preserve existing content when editing. Read before writing, update only the intended fields/sections, and read back to confirm. Before retrying a create after failure, search for the artifact already created. On reruns reuse existing children, follow-ups, and notes; reconcile discrepancies instead of duplicating them. Respect concurrent changes and stop on conflicting edits. Tracker publication/notifications follow project and user authorization; no tracker convention grants permission to push code or open PRs.

## Planning baseline and worktrees

Before implementation or fan-out, preserve the approved brief, design, slice scope/criteria, and dependency graph as a durable baseline:

- **Git-local:** selectively commit the changed planning artifacts, excluding unrelated changes. Record the commit and make it reachable in implementation worktrees.
- **Remote:** save and read back the approved artifacts. Record their immutable version/history references, or a durable snapshot of the approved content when the backend has no version history. A mutable issue URL alone is not an approved baseline. Use an existing project-approved snapshot location; ask if none exists.
- **Mixed:** satisfy both requirements for the respective artifacts and link them. Do not duplicate the live source of truth.

Every agent must be able to load the mapping and approved baseline. Give agents their references explicitly; shared remote accessibility does not imply a local commit. Material plan changes require the relevant approval again and an updated baseline.

## Implementation evidence and completion

A completed tracker state does not prove code is present. Record a stable slice-to-implementation mapping using a commit/revision or an unambiguous development/PR link that resolves to the actual integrated revision. Commit subjects containing the slice reference are a discovery fallback, not the only allowed mapping. Verify the resolved revision is an ancestor of the checkout's `HEAD`; confirm that the mapping identifies the slice's implementation, not just a metadata commit. With squash/rebase/cherry-pick, resolve and verify the integrated equivalent and update the mapping rather than accepting an unreachable old SHA. Ask if evidence is ambiguous. A merged PR label alone is insufficient.

- **Git-local completion:** after verification and review, commit code plus relevant task/AC/notes changes together where possible. The resulting commit identifies that state; don't try to embed its own SHA inside itself. Any later revision-link update is metadata-only and must not obscure which commit contains the implementation.
- **Remote/mixed completion:** commit verified code (and any local metadata that can truthfully be recorded), then update the remote artifact with criteria evidence, decisions/deferrals/friction, implementation revision, and completed state. Read back before reporting synchronized completion. Git and a remote tracker are not atomic. If synchronization fails, report “code committed; tracker update pending” with revision and outstanding operations; do not claim full completion or allow dependent fan-out until reconciled. Resume by reading current state and retry only missing updates. Do not roll back good code merely to simulate atomicity.
- Preserve the project's integration rules. No automatic push or PR creation. If its required completion transition depends on publication/merge the user has not authorized, keep the mapped intermediate state, record local evidence, and report the blocked transition.

The same read-back and failure rules apply to saving QA, creating approved follow-ups, and closing the parent. Never close with unresolved blockers or missing required verification. Do not overwrite a concurrent reopening.

## QA freshness

Record the tested implementation revision. Reuse QA only when no behavior-affecting content changed between it and the current checkout. Inspect committed differences, staged/unstaged changes, and untracked files. Exclude only mapped paths confirmed to contain solely tracking metadata; never exclude code, migrations, configuration, test fixtures, or executable scripts because they share a tracker directory. With remote-only tracking there may be no paths to exclude. Scope/criteria/design changes also invalidate affected QA even if code is unchanged; compare against the approved baseline. Missing or ambiguous evidence requires fresh verification.

## Backlog.md mapping (only when the project uses it)

Backlog remains supported, not the default for unrelated projects. Follow the installed version's help and project conventions:

- `backlog task view <id> --plain` / `backlog task list --plain`: read/discover tasks; `backlog task list -p <parent-id> --plain`: children.
- `backlog task create "<title>" -d "<description>"`: parent; child creation adds `-p <parent-id>`, repeatable `--ac "<criterion>"`, and `--depends-on <id-or-comma-list>` for actual prerequisites. Preserve a parent backlink in the description where existing tasks use it.
- `backlog task edit <id> -s "<mapped-status>"`: lifecycle; `--check-ac <index>`: criterion completion after rereading its current text/index. Follow installed help for description and notes edits; preserve unrelated sections.
- Keep brief/design in the parent and scope/ACs in children. Use `Decisions`, `Deferrals`, `Friction`, and `QA` sections or existing equivalent conventions.
- Use the installed draft operations for approved follow-ups if the project uses drafts; otherwise follow its deferred-task convention. Do not assume draft promotion syntax.
- `backlog/tasks/` and `backlog/drafts/` are typical Git-local metadata locations, not blanket exclusions. Discover actual paths/configuration and selectively commit changed artifacts. Verify which exact files are metadata-only before excluding them from QA diffs.
