# Optional parallel slice protocol

Read this only when the user explicitly opts into parallel implementation. The default `/feature-implement` path handles one slice and performs no automatic fanout discovery.

## Preconditions

- Name a coordinator responsible for waiting, collecting results, integrating them, and reporting failures.
- Require a clean integration checkout, a durable approved planning baseline readable by every worker, and the tracking mapping from `../../feature-spec/references/tracking-conventions.md`.
- Select only sibling slices whose dependencies are complete and whose mapped implementation revisions are reachable from integration `HEAD`.
- Require isolated worktrees/branches for every worker and a repository-supported merge or cherry-pick path. If isolation or convergence support is unavailable, do not fan out.

## Dispatch

- Give each worker exactly one slice reference, its parent and dependency references, the planning baseline, tracking mapping, worktree, and branch.
- Each worker runs `/feature-implement` for that slice, must not fan out recursively, and must not push or open a PR.
- Keep dependency waves separate. Do not start a dependent slice merely because its prerequisite worker reports success.

## Converge

1. Wait for every worker in the current wave and collect its verified commit, tracker result, checks, and blockers.
2. Stop and report failed workers, missing commits, ambiguous mappings, or conflicts; do not guess or mark convergence complete.
3. Integrate successful commits into the coordinator checkout in dependency order using repository conventions.
4. Verify every integrated slice revision is reachable from integration `HEAD` and that dependency revisions precede their dependents.
5. Run integration-relevant tests, type checks, lint/build checks, migrations, and browser flows affected by the combined changes.
6. Treat any failed convergence check as blocking even if individual slices are marked complete. Reconcile tracker state truthfully and do not begin the next dependency wave until prerequisites are integrated, reachable, and checks pass.

After the final wave, report the assembled revision, integrated slices, checks, and any unresolved synchronization failures. `/feature-settle` remains a separate feature-level QA and security gate.
