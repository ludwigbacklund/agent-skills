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
- For every slice, require the mapped completed state and verify every implementation revision in its corresponding repository checkout. A single repository is the one-entry case. Status alone is not evidence. Stop on missing, ambiguous, reopened, or unreachable work.
- Apply the shared QA-freshness rules; bookkeeping changes alone don't require repeating QA.
- Reuse a non-blocking QA verdict only when its tested revision and planning baseline remain truthful; otherwise rerun QA. If the parent is already complete, ask whether to re-QA, re-triage, or stop.

## 2. Verify the assembled feature

Create a short QA plan from the brief:

- the end-to-end flow across slices against the brief's observable outcomes; for user-facing work, replay the original primary scenario and approved walkthrough (resolve a missing scenario through shaping rather than substituting a tour of controls);
- hand-offs and assumptions at slice seams;
- important error, empty, boundary, concurrency, or ordering cases not covered by one slice;
- the affected repository revision set and ordered migration stack, when applicable.

Show the plan, then run safe local checks without waiting. Ask first only for ambiguous scope or destructive, irreversible, production, real-user-data, or external-side-effect actions.

- Exercise the assembled original job, including finding outstanding work and recognizing completion, rather than aggregating slice passes or repeating every slice acceptance criterion.
- Run each affected repository's full relevant tests, type checks, lint/format checks, and required build checks.
- Verify UI flows and adversarial states in a browser with safe realistic data. Missing access or capability blocks the verdict; do not infer success.
- For user-facing work, replay the original primary scenario with safe representative data through its completion signal. Look for repeated entry or decisions, hidden prerequisites, navigation between slices, warnings users must remember, inconsistent terminology, unresolved next steps, and unclear consequences or recovery. Assess total effort and uncertainty: users should not have to coordinate our slices. Distinguish implementation defects from flaws in the approved design; return material design changes to shaping with evidence and a concrete alternative. Ordinary simplification that preserves approved commitments is allowed through existing triage; do not silently redesign approved behavior.
- Packets and screenshots are optional useful inputs, not proof of integrated behavior or substitutes for browser access. If useful, follow `../feature-implement/references/experience-packet.md` for storage and freshness; keep generated review artifacts in the working repository's ignored `.feature-reviews/` folder, never in Git. No storyboard, packet, or separate demo run is required.
- For migrations, apply the complete sequence to non-empty safe data, confirm the final schema and compatibility, and identify dangling expand→contract work.
- Run one focused security review of the assembled feature diff using the security-review capability when available, otherwise directly inspect authorization, injection, secrets, SSRF, trust boundaries, and similar attack paths. Exploitable findings are blocking.

Record one durable QA verdict on the parent containing:

- pass or issues-found verdict;
- tested implementation revision set and approved-plan reference;
- environment and representative data;
- integration checks and security outcome;
- separately: verified behavior, observed experience findings, and unresolved uncertainty for the original scenario, with scope and evidence limits. Distinguish expert review from actual-user testing; never imply the latter without it;
- issues classified as blocking or minor.

Replace stale prior evidence rather than stacking it. For Git-local tracking, leave the QA update for the final atomic settlement commit. Read back remote writes. A recording failure or any required blocked check prevents closure.

Material behavior, experience/design, or security failures are blocking even when slice checks and functional tests pass; do not route them as minor polish. Stop and ask whether to create a fix slice, return to shaping, or pause. Preserve the QA record and, for local files, explicitly report that it remains uncommitted and where to find it. Uncertainty central to the original job cannot silently count as no defect: investigate proportionately or ask the user to explicitly accept the remaining uncertainty in existing triage. Acceptance cannot bypass demonstrated material failures or required verification. Otherwise continue directly to triage.

## 3. Review and human triage

- Reconfirm QA freshness and every repository revision's reachability before triage.
- Read only useful systemic friction from slice records; empty or routine history is not a finding.
- Obtain an independent, **report-only** review of the cumulative feature diff using code-review when available, otherwise fresh-context review or a focused direct review. Do not auto-fix. Focus on cross-slice correctness, duplication, inconsistent conventions or naming, and seam-level test gaps.
- Combine and deduplicate slice friction, assembled-diff findings, minor security findings, QA issues, and remaining uncertainty requiring a decision. Preserve provenance and call out repeated patterns. For durable lessons, propose a targeted update to canonical project instructions or the active design, whichever owns the decision; do not bury generic guidance in slice notes. Check whether existing guidance was missing, unclear, or simply not followed before adding instructions. Avoid duplicate rules or a debugging diary; route proposed updates through human triage. If nothing remains, record that and proceed to close.

Present all candidates in one numbered batch. For each include:

- a stable number and short title;
- source/provenance;
- proposed action and why it matters;
- rough cost;
- a recommendation of **fix now**, **follow-up**, or **drop**.

Ask once for numbered decisions. Omitted or ambiguous items are not approved; collect remaining questions in one follow-up and keep the feature open.

Act only on approved dispositions:

- **Fix now:** make the bounded change, run targeted tests plus relevant types/lint/build checks, commit it separately under repository conventions, and verify the commit. Rerun every integrated browser/behavior check it could affect and rerun security review for security-sensitive paths. Update the QA tested revision and evidence, refreshing any optional captures invalidated by the fix. Failed or blocked rechecks, an uncommitted fix, or failed metadata synchronization prevents closure.
- **Follow-up:** create one durable draft/deferred item in the mapped store with the approved problem, proposal, rationale, cost, provenance, and promotion path. Read back the write.
- **Drop:** record no work item and do not argue. For remaining uncertainty, record the user's explicit acceptance and its limits in QA; omission or a generic drop is not acceptance. Neither drop nor follow-up permits closure with demonstrated material failures or blocked required checks.

Append newly discovered findings with new stable numbers rather than silently handling them.

## 4. Close and report

Close only when:

- QA is fresh and non-blocking;
- approved fixes are landed and reverified;
- every slice revision remains reachable in its corresponding repository;
- every candidate has a human-approved disposition, including explicit acceptance of any remaining central uncertainty;
- required tracker writes succeeded.

Follow the shared completion policy for Git-local versus remote metadata, atomic settlement records, publication gates, retries, and failures. Do not push or open a PR unless requested; never describe partial synchronization as success.

Report in order:

- **QA:** verified behavior/test results, observed experience findings, unresolved uncertainty and any explicit acceptance, tested revision, and accepted minor issues; name the original scenario and evidence limits, linking optional review artifacts when useful;
- **Fixed now:** changes and revisions;
- **Follow-ups:** stable references and titles;
- **Dropped:** numbered items;
- **Feature:** closed, or held open with the exact blocker.

End with the project's mapped instructions for listing and promoting follow-ups.
