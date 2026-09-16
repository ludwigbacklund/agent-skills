---
name: feature-settle
description: Close out a feature after all slices land by verifying assembled behavior against the brief, running a security review, triaging accumulated friction, and closing the parent task. Clean or minor-issue QA flows into reflective triage; blocking issues pause for user direction. Use after the last slice is implemented. Triggers include "settle this feature", "close out this task ID", "let's wrap up the feature", or an explicit /feature-settle invocation.
---

# /feature-settle — Verify + Reflect + Close (two-phase)

Take a feature whose slices have all landed and settle it: confirm the assembled thing actually behaves the way the brief promised, then reflect on what the build taught you and close the parent out. The phases normally run back-to-back; only blocking QA or security issues stop before Phase B. Phase A saves a QA verdict; Phase B triages friction and closes the feature.

This is the closing bracket of the feature pipeline — the counterpart to `/feature-spec` (open the problem) and `/feature-shape` (open the solution). It runs **once per feature, after the last slice is implemented**, on the whole feature at once.

QA and reflection are different modes — exercising a running feature vs. reading code and triaging with a human. Minor findings flow directly into triage, where their disposition is decided. Pause only when QA finds a blocking issue that means the feature is not currently closable.

## When to use

- User invokes `/feature-settle <parent-id>` (or just `/feature-settle` — then ask which feature).
- Run it **after all child slices of a feature are `Done`/landed**, not after each slice. Per-slice verification already happened inside `/feature-implement`; this is the feature-level pass.
- The skill auto-detects which phase to run based on the parent task's state:
  - No mapped QA record → run **Phase A (QA)**, then continue to Phase B unless QA found a blocking issue.
  - Has a mapped QA record with pass or minor issues, its tested code revision is still current, and the parent isn't closed → jump straight to **Phase B (triage + close)**.
  - Has a mapped QA record with a blocking issue → rerun **Phase A** after fixes land; never bypass the blocker based on the record's presence.
  - Parent already `Done` → ask whether to re-QA, re-triage, or stop.

## What this skill does NOT do

- **Re-run each slice's acceptance criteria.** `/feature-implement` verified those per slice. Phase A tests the *assembled* feature, not the slices again.
- **Make line-by-line bug-hunting the goal.** Phase A is about *behavior*, not the diff.
  Phase B runs a report-only review of the assembled diff to surface cross-slice cleanup
  candidates for triage, never to auto-fix. A security review of the assembled diff is also
  in scope once per feature, as a distinct exploit-focused lens beyond per-slice review.
- **Auto-fix or auto-create drafts.** Every Phase B action is approved by the human, item by item.
- **Run destructive browser actions without approval.** UI verification is automatic unless it is destructive, irreversible, touches production or real user data, or causes an external side effect.
- **Push or open a PR.** Slices already committed via `/feature-implement`'s land step; publishing stays the user's call.

---

## Phase A — Assembled-feature QA

### Litmus test (QA)

For every candidate check, ask:

> _"Does this exercise the feature as an integrated whole, or is it just re-testing one slice?"_

- **Integrated whole** → belongs here: cross-slice flows, the seams between slices, behavior against the brief's intent, edge/error/empty states no single slice's happy-path ACs covered.
- **One slice again** → drop it. `/feature-implement` already verified each slice against its own ACs.

The whole point is to catch what *only* shows up once the slices are assembled — the integration seams and the brief-level intent that no single-slice agent could see.

### What goes in

- **The cross-slice flow** — the end-to-end path a user takes *across* slices, not within one.
- **The seams** — where one slice's output feeds another. Mismatched assumptions hide here.
- **Adversarial / edge behavior** — errors, empty states, boundaries, concurrent or out-of-order actions the per-slice happy-path ACs skipped.
- **Brief-level intent** — does the assembled feature actually solve the problem the brief framed? Not "do the slices work," but "did we build the right thing."

### What stays out

- Re-checking each slice's individual ACs.
- Code-level bug hunting or diff review (defer to Phase B's assembled-diff review).
- Re-running the per-slice happy paths just to watch them pass again.

### Process

#### A1. Setup

- **Mandatory:** read `../feature-spec/references/tracking-conventions.md` before any tracker operation.
- Discover and follow the repository's project instructions, available tracking tools, and tracking conventions. Establish the project-specific mapping for stable feature/slice references, parent-child hierarchy, dependencies, acceptance criteria, lifecycle states, notes, drafts, QA revision metadata, and metadata paths. Persist that mapping in the durable location prescribed by the shared conventions so later agents can use it. Use native tracker fields where available; otherwise use explicit links and checklists. Do not assume a particular tracker, CLI, directory, or status spelling.
- Get the stable parent feature reference from the argument; otherwise semantically list candidate features and ask which one to settle.
- Semantically load the parent brief and approved design plus all child slices, their ACs, dependencies, notes, lifecycle states, and implementation mappings. Require an approved planning baseline that is either a reachable Git commit or a durable remote snapshot/version readable by agents; if neither exists, stop.
- **Confirm all slices have landed before phase detection.** For every in-scope slice, require a lifecycle state equivalent to `Done`, resolve its implementation revision from an explicit tracker commit/PR mapping, native development link, or other unambiguous evidence, and verify that revision is reachable from current `HEAD` with `git merge-base --is-ancestor <revision> HEAD`. A commit subject containing the stable slice reference is one fallback discovery method, not exclusive proof. Disambiguate conflicting candidates from tracker history/links or ask. If a slice was reopened or its implementation revision is missing, ambiguous, or unreachable, stop and identify it—status alone never proves that the assembled checkout contains the slice.
- Phase detection: read the mapped tested implementation revision from the QA record. A verdict is fresh only when no code or other behavior-affecting file differs between that revision and the current checkout, including uncommitted changes. Exclude **only** the exact metadata paths established by the persisted tracker mapping; never blanket-exclude an assumed tracker directory, and never exclude code. Build the `git diff` pathspec from those mapped paths and inspect uncommitted changes under the same rule. Pure bookkeeping or QA-record changes do not stale behavioral evidence, but scope, criteria, or design changes invalidate affected QA even when code is unchanged. Compare current planning content with the approved baseline, including remote changes, and inspect untracked files as well as tracked differences before reusing evidence. If evidence is fresh and records pass or minor issues, skip to Phase B. If behavior-affecting files changed, rerun Phase A and replace the old verdict. If it records a blocking issue, rerun Phase A only after relevant fixes land; if still unresolved, stop. If the parent is already in the mapped `Done` state, ask whether to re-QA, re-triage, or stop.

#### A2. Derive a QA plan

From the brief and the full set of slices, write a short plan — not a doc:

- **The integration flow** — the path across slices a user actually takes, start to finish.
- **The seams** — the specific hand-offs between slices to probe.
- **Adversarial cases** — the error/empty/boundary states, drawn from the brief, that no slice's ACs covered.
- **Migration stack** (only if the feature changed an existing schema/contract) — the feature's migrations applied in order, on realistic data, as one sequence.

Show the plan to the user, then immediately run safe local checks. Do not wait for approval unless the plan includes an ambiguous-scope, destructive, irreversible, production, real-user-data, or external-side-effect action.

#### A3. Exercise

- Run the full suite once on the integrated whole to catch integration breakage: `pnpm test`, `pnpm tc`, `pnpm lint` (or whatever the project uses). These are a backstop, not the point — the point is behavior.
- For behavior/UI, automatically run browser verification for the integration flow and adversarial cases from the plan. Prefer an available tester delegate for the bounded QA plan when suitable; otherwise use the available browser/testing capability directly. Ask first only before destructive or irreversible actions, actions against production or real user data, or external side effects such as purchases or sending messages. If verification requires credentials or access that are unavailable, ask for what is needed. If a required check cannot be completed, record verification as blocked and treat the verdict as blocking rather than closing on an assumption.
- Walk the QA plan item by item. For anything you can check without the browser (server flows, data invariants across slices, error responses), check it.
- **If the feature has migrations:** apply them in order on a realistic, non-empty database, start to finish. Confirm they stack cleanly (no migration assumes a shape an earlier one didn't create), the final schema matches the design, and flag any **dangling expand** — an expand→contract whose contract step was deferred and still needs a follow-up task. This is the cross-slice seam a per-slice check can't see.
- **Run a security review on the feature's changes**—the once-per-feature security gate. Use
  the `security-review` skill when available; otherwise perform a focused review of the
  assembled diff for injection, authorization gaps, leaked secrets, SSRF, and similar attack
  paths. Run it inside the repository and fold its output into the QA verdict. An exploitable
  finding is **blocking**; carry lower-severity findings into Phase B triage.

#### A4. Record the verdict

Semantically write the following QA record to the parent's mapped QA/notes field so the outcome survives into Phase B and beyond:

```markdown
## QA

Verdict: [pass / issues found]
Tested implementation revision: [verified Git revision for the implementation being tested]
Environment: [local/test environment and relevant fixture or dataset]

### Checked
- [Integration flow / seam / adversarial case exercised]

### Issues (omit if none)
- [What's wrong] — [which seam / slice] — [blocking / minor]
```

Preserve existing notes. When rerunning Phase A after a blocking or stale verdict, replace the prior QA record rather than stacking another. For a remote tracker, read the latest parent immediately before updating, preserve unrelated edits, and make retries idempotent. A sync failure must be reported and blocks any claim that QA was durably recorded.

For Git-local metadata, do not commit the QA record during Phase A; leave it pending for Phase B's atomic settlement commit. If a blocking issue stops the flow before Phase B, report that the record is uncommitted. Remote QA metadata may be saved immediately. The tested implementation revision intentionally precedes any eventual metadata-only settlement commit; only the exact mapped metadata paths may be ignored by the freshness check.

A **blocking** issue means the feature is not done—surface it and stop; it likely needs a fix
slice via `feature-implement` or a scope conversation, not a close-out. Minor issues can be
carried into Phase B triage. An exploitable security-review finding is blocking by default—do
not close a feature over a known live vulnerability.

#### A5. Continue or pause — gated on blocking issues

- Confirm the verdict was recorded in the parent task (parent ID + pass/issues) and summarize the QA result in 1–2 lines.
- **Clean verdict** → continue straight into Phase B.
- **Minor issues only** → carry them into Phase B triage and continue without a separate checkpoint. Triage is where the user decides their disposition.
- **Any blocking issue** → stop. The feature is not ready to close. Surface the issue and ask whether to create or run a fix slice, revisit scope, or pause. An exploitable security finding is blocking by default.

Do not add a generic “continue?” prompt between QA and triage; only an actual blocker justifies stopping.

---

## Phase B — Reflective triage + close

Walk the human through (a) friction notes that implementing agents left on slice tickets, (b) the code those agents actually wrote, and (c) the issues Phase A surfaced, then for each item agreed to be worth acting on, **either fix it on the spot or capture it as a draft**. Finish by closing the parent feature.

This phase exists because implementation often happens in parallel agents (foreground or fanned out in worktrees), each with its own context that evaporates when it finishes. The friction notes are the explicit record; the code they shipped is the implicit record, where patterns visible only in hindsight (duplicated boilerplate, awkward shapes nobody flagged because each agent only saw one slice) hide. Phase A's "feel" for how the assembled feature behaved is a third source — jank you noticed while exercising it is often friction worth triaging.

### Process

#### B1. Re-entry check

- Semantically reread the parent. Confirm its mapped QA record is present, contains no unresolved blocking issue, and is fresh under A1's revision check. If absent or stale, run Phase A first; if blocking, return to Phase A after fixes rather than entering triage + close.
- Reconfirm every child slice is in mapped `Done`, resolve its implementation revision using A1's evidence hierarchy, and verify it remains reachable from current `HEAD`. This catches slices reopened after QA; lifecycle state alone is insufficient.
- Establish scope through the mapped parent-child relationship and read each slice's **`## Friction`** subsection from its mapped notes field.

#### B2. Inspect the code that shipped

The friction notes are the explicit record. The code is the implicit record—it shows patterns
no individual agent could see because each had only one slice's context. Per-slice review
already swept each slice's own diff in `feature-implement`; this pass is for what only emerges
once the slices sit together.

- Resolve implementation revisions for each in-scope slice from explicit tracker commit/PR mappings or native development links first. Use `git log` ranges and stable-reference commit-subject searches only as fallback evidence. Disambiguate conflicts and ask the user for the range if it remains unclear.
- **Review the cumulative diff**—the whole feature commit range (`git diff <base>..<head>`),
  whether it landed on a feature branch or directly on the default branch, not one slice. Use
  the `code-review` skill when available. Otherwise, prefer suitable fresh-context review
  delegation when the harness provides it, or perform a focused, report-only review directly.
  Do not auto-fix; findings are *candidates* that B4
  triages with the user in one numbered batch. The assembled view should specifically catch reuse,
  duplication, and inconsistencies that per-slice reviews cannot see.
- Then add the few signals a diff-scoped reviewer under-weights, because they're about *consistency between independently-built slices* rather than the quality of any one diff:
  - **Diverging conventions** — two slices solved the same problem different ways. One is probably better; pick or propose a unified approach.
  - **Naming drift** — the same concept named three different ways across slices.
  - **Cross-slice test gaps** — a seam each slice's own tests touched only from its own side, so nothing exercises the hand-off itself.
- Treat each code-review finding and each cross-slice signal as a *candidate friction item* to bring into triage.

#### B3. Aggregate

- Combine three sources: explicit friction from slice notes + hindsight findings from code inspection + the issues/jank Phase A's QA surfaced. Keep provenance (slice ID, file path, or "QA") alongside each item.
- Look for **patterns** — friction flagged in multiple slices, or repeated in the diffs, is the strongest signal. Surface patterns explicitly.
- If nothing surfaced from any source, record that no friction was found and continue to close. Mention this in the handoff and invite optional follow-up, but do not block on a hindsight question.

#### B4. Triage (one numbered batch)

Finish collecting all sources in B3 and deduplicate overlapping findings before asking for decisions. Present **all items in one response**, with stable numbers:

> **1. [Short title]** — [what was flagged or noticed]
> **Source / surfaced in:** [slice notes / code inspection / QA / cross-slice pattern; slice IDs or file paths]
> **Proposed change:** [concrete fix or draft proposal]
> **Why it matters:** [cost of leaving it as-is]
> **Rough cost:** [small / medium / large]
> **Recommendation:** [fix now / draft / drop, with a brief reason]

Ask once for numbered decisions, for example:

```text
1. draft
2. fix now
3. draft
4. drop
```

The user may include edits to a proposal alongside its decision. A numbered decision explicitly approves that item's action; do not ask for confirmation again. Never infer approval for omitted items. Batch any missing decisions or material ambiguities into one follow-up, retaining the original numbers, and leave the feature open until all items are resolved. If new findings emerge during fixes, append new numbers and batch them rather than restarting triage.

Recommend the **most pragmatic option**, but wait for the user's choices:

- **Small + obvious + low-risk → fix now.** Renames, dead code removal, extracting an obvious helper, deleting a stray TODO, tightening a type, fixing a comment. Just do it in this conversation. No ticket overhead.
- **Larger / cross-cutting / needs design → draft.** Refactors that touch many files, new abstractions, anything where the *proposal* needs discussion before someone picks it up.
- **Not worth it → drop.** Acknowledged, not preserved.

If the user says "fix now": make the change directly and run the targeted tests plus format/lint/type checks appropriate to what changed. Report it in one line. Then **commit and verify the triage fix** as a focused code commit on the convention-appropriate branch that references the parent; exclude pending Git-local tracker metadata and never push or open a PR. After the commit, rerun every integration or browser check from Phase A that the change could affect. If it touches auth, trust boundaries, input handling, secrets, or another security-sensitive path, rerun the focused security review too. A failed or blocked recheck prevents closure. Replace the QA record's tested implementation revision with the verified fix commit and update its checked evidence. For remote metadata, reread before updating and retry idempotently; a sync failure blocks closure and must be reported, never described as success. For Git-local metadata, B6 lands the update atomically. If the user says not to commit the fix, leave the feature open because QA cannot be bound to landed code.

If the user says "draft", treat that as approval of the proposed change, rationale, and rough cost shown for that item, incorporating any edits they supplied. Save it in B5 without a separate drafting interview or confirmation. If material framing is missing or the user's edits are ambiguous, collect questions for **all affected drafts in one follow-up**; do not interview one item at a time. Preserve the approved framing rather than silently expanding scope.

If the user says "drop" → skip that item. Don't argue.

#### B5. Save drafts

For each approved item, semantically create one draft in the mapped draft store, distinct from committed work, with a stable reference and the project's learning label/category when available:

```markdown
## Friction
[What made this awkward — refined from slice notes, code inspection, QA, and the conversation]

## Proposed change
[What we'd do about it]

## Why it matters
[Cost of leaving it]

## Rough cost
[small / medium / large]

## Surfaced in
- <stable-slice-ref> / <file-path> / QA
```

Use the tracker's native draft capability when available; otherwise use the explicit mapped draft lifecycle/state and links. Record how an approved draft is promoted through the project's semantic promotion operation. For remote trackers, read-first and retry idempotently; report sync failures and do not claim the draft was saved.

#### B6. Close the feature

Once QA passed (or its minor issues were triaged and accepted), its evidence is fresh, friction is triaged, and every slice's verified implementation revision is reachable, close using the applicable storage sequence below. Respect any project-required publication/merge gate; if it is not satisfied, retain the mapped intermediate state and report the blocker rather than publishing without authorization.

- **Git-local tracker metadata:** immediately before committing, transition the parent to the mapped `Done` state, then commit the parent status, final QA metadata, and drafts from this settle run as one atomic settlement commit referencing the stable parent reference. Include only mapped metadata artifacts from this run, confirm the commit succeeded, and report its revision + subject. If it fails, restore the parent to its prior open state.
- **Remote tracker metadata:** all code and any triage fixes must already be committed and verified. Read the latest parent and related drafts, preserve unrelated edits, write final QA revision evidence and draft links, then transition the parent to `Done` as the last semantic operation. Make retries idempotent. If any update fails, report the synchronization failure, do not claim success, and leave or restore the parent to the closest open state when possible.
- Do not push or open a PR unless explicitly requested.

Do **not** close if Phase A left a blocking issue unresolved, QA became stale, a post-fix recheck failed, tracker synchronization is incomplete, or any slice implementation revision is not reachable. State the blocker and leave the parent open.

#### B7. Hand off

Report, in this order:

- **QA:** the verdict (pass, or which issues remain and their disposition).
- **Fixed now:** one line per change, with file paths.
- **Drafted:** stable references + titles.
- **Dropped:** items the user acknowledged but didn't act on.
- **Feature:** closed (`Done`) or held open (with why).

End with the project-specific semantic instructions for listing open learning drafts and promoting an approved draft, using the persisted tracker mapping rather than assuming a command.

---

## Anti-patterns

**Phase A (QA):**

- ❌ Re-running each slice's acceptance criteria. That already happened per slice; QA tests the assembled whole.
- ❌ Hunting code-level bugs or reviewing the diff for style during Phase A. That belongs in
  Phase B's assembled-diff review.
- ❌ Skipping browser verification for UI behavior. Run it automatically unless it would be destructive, irreversible, affect production/real user data, or cause an external side effect.
- ❌ Closing the feature from Phase A. Phase A only records a verdict; closing happens in Phase B after triage.
- ❌ Settling a feature whose slices aren't all landed. Stop and say which are unfinished.

**The pause (blocking issues only — see A5):**

- ❌ Pausing on a clean verdict or minor issues. Flow straight into Phase B; minor findings belong in triage.
- ❌ Sliding past a blocking QA or security issue. The feature is not closable until the user chooses a fix or scope path.
- ❌ Adding a generic “continue?” checkpoint between phases.

**Phase B (triage + close):**

- ❌ Defaulting to "draft" for everything. Small agreed fixes happen in-conversation; tickets have overhead.
- ❌ Presenting triage items or draft-shaping questions one at a time. Collect them and ask in a batch.
- ❌ Fixing things without explicit user approval. "Fix now" is opt-in per numbered item; one reply can approve many items.
- ❌ Reconfirming an explicit numbered decision or treating an omitted item as approved.
- ❌ Bundling many small fixes silently. Name each change so the user can veto.
- ❌ Going on a code-inspection spree beyond the feature scope ("while we're here...").
- ❌ Treating raw friction notes, code findings, or QA issues as drafts already. They're observations; the proposal is shaped during triage.
- ❌ Polishing or expanding the user's framing without asking.
- ❌ Pushing back when the user says "drop." Triage means a real chance to discard.
- ❌ Skipping the pattern check or the code inspection. Cross-slice patterns are usually the strongest signal and the reason this phase exists for parallel agents.
- ❌ Closing the parent while a blocking QA issue is unresolved. The feature isn't done.
- ❌ Trusting a stored QA verdict without checking that its tested implementation revision still matches the code.
- ❌ Closing after a triage code fix without rerunning the affected behavioral and security checks.
- ❌ Treating `Done` lifecycle states as proof that slice implementation revisions are integrated into the current checkout.
