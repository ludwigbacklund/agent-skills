---
name: feature-settle
description: Verify an assembled feature, run its security gate, triage cross-slice findings with the user, and close the parent. Use after all slices have landed.
---

# /feature-settle — Verify, Triage, Close

Run once after every feature slice has landed. Test the assembled behavior against the approved brief, review the combined implementation, triage useful findings, and close only with fresh evidence.

## 1. Establish readiness

- Read `../feature-spec/references/tracking-conventions.md` and follow the project's tracking conventions.
- Resolve the stable parent reference, or list likely features and ask.
- Read the approved brief/design, all in-scope slices, dependencies, implementation mappings, decisions, deferrals, friction, and existing QA record.
- Require a durable approved planning baseline.
- For every slice, require the mapped completed state and verify its implementation revision is an ancestor of current `HEAD`. Status alone is not evidence. Stop on missing, ambiguous, reopened, or unreachable work.
- Apply the shared QA-freshness rules; bookkeeping changes alone don't require repeating QA.
- Reuse a non-blocking QA verdict only when its tested revision and planning baseline remain truthful; otherwise rerun QA. If the parent is already complete, ask whether to re-QA, re-triage, or stop.

## 2. Verify the assembled feature

Create a short QA plan from the brief:

- the end-to-end flow across slices;
- hand-offs and assumptions at slice seams;
- important error, empty, boundary, concurrency, or ordering cases not covered by one slice;
- the ordered migration stack, when applicable.

Show the plan, then run safe local checks without waiting. Ask first only for ambiguous scope or destructive, irreversible, production, real-user-data, or external-side-effect actions.

- Exercise integrated behavior rather than repeating every slice acceptance criterion.
- Run the repository's full relevant tests, type checks, lint/format checks, and required build checks.
- Verify UI flows and adversarial states in a browser with safe realistic data. Missing access or capability blocks the verdict; do not infer success.
- For migrations, apply the complete sequence to non-empty safe data, confirm the final schema and compatibility, and identify dangling expand→contract work.
- Run one focused security review of the assembled feature diff using the security-review capability when available, otherwise directly inspect authorization, injection, secrets, SSRF, trust boundaries, and similar attack paths. Exploitable findings are blocking.

Record one durable QA verdict on the parent containing:

- pass or issues-found verdict;
- tested implementation revision and approved-plan reference;
- environment and representative data;
- integration checks and security outcome;
- issues classified as blocking or minor.

Replace stale prior evidence rather than stacking it. For Git-local tracking, leave the QA update for the final atomic settlement commit. Read back remote writes. A recording failure or any required blocked check prevents closure.

Stop on a blocking behavior or security issue and ask whether to create a fix slice, revisit scope, or pause. Preserve the QA record and, for local files, explicitly report that it remains uncommitted and where to find it. With pass or minor issues, continue directly to triage.

## 3. Review and aggregate

- Reconfirm QA freshness and slice reachability before triage.
- Read only useful systemic friction from slice records; empty or routine history is not a finding.
- Obtain an independent, **report-only** review of the cumulative feature diff using code-review when available, otherwise fresh-context review or a focused direct review. Do not auto-fix. Focus on cross-slice correctness, duplication, inconsistent conventions or naming, and seam-level test gaps.
- Combine and deduplicate slice friction, assembled-diff findings, minor security findings, and QA issues. Preserve provenance and call out repeated patterns. If nothing remains, record that and proceed to close.

## 4. Human triage

Present all candidates in one numbered batch. For each include:

- a stable number and short title;
- source/provenance;
- proposed action and why it matters;
- rough cost;
- a recommendation of **fix now**, **follow-up**, or **drop**.

Ask once for numbered decisions. Omitted or ambiguous items are not approved; collect remaining questions in one follow-up and keep the feature open.

Act only on approved dispositions:

- **Fix now:** make the bounded change, run targeted tests plus relevant types/lint/build checks, commit it separately under repository conventions, and verify the commit. Rerun every integrated browser/behavior check it could affect and rerun security review for security-sensitive paths. Update the QA tested revision and evidence. Failed or blocked rechecks, an uncommitted fix, or failed metadata synchronization prevents closure.
- **Follow-up:** create one durable draft/deferred item in the mapped store with the approved problem, proposal, rationale, cost, provenance, and promotion path. Read back the write.
- **Drop:** record no work item and do not argue.

Append newly discovered findings with new stable numbers rather than silently handling them.

## 5. Close and report

Close only when:

- QA is fresh and non-blocking;
- approved fixes are landed and reverified;
- every slice revision remains reachable;
- every candidate has a human-approved disposition;
- required tracker writes succeeded.

Follow the shared completion policy for Git-local versus remote metadata, atomic settlement records, publication gates, retries, and failures. Do not push or open a PR unless requested; never describe partial synchronization as success.

Report in order:

- **QA:** verdict, tested revision, and any accepted minor issues;
- **Fixed now:** changes and revisions;
- **Follow-ups:** stable references and titles;
- **Dropped:** numbered items;
- **Feature:** closed, or held open with the exact blocker.

End with the project's mapped instructions for listing and promoting follow-ups.
