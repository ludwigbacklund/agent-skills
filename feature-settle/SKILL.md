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
  - No `## QA` section → run **Phase A (QA)**, then continue to Phase B unless QA found a blocking issue.
  - Has `## QA` with pass or minor issues, its tested code revision is still current, and the parent isn't closed → jump straight to **Phase B (triage + close)**.
  - Has `## QA` with a blocking issue → rerun **Phase A** after fixes land; never bypass the blocker based on the section's presence.
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

- Verify `backlog` CLI is available: `which backlog`. If missing, stop and tell the user.
- Get the parent feature ID:
  - If passed as arg, use it.
  - Otherwise run `backlog task list --plain` and ask which feature to settle.
- Load context: `backlog task view <parent-id> --plain` for the brief + `## Design`, then `backlog task list -p <parent-id> --plain` for the child slices and `backlog task view <slice-id> --plain` for each slice's ACs and notes.
- **Confirm all slices have landed before phase detection.** For every in-scope slice, require status `Done`, find the unique commit whose subject contains its exact slice ID, and verify it is reachable from current `HEAD` with `git merge-base --is-ancestor <sha> HEAD`. If a slice was reopened, or a commit is missing, ambiguous, or unreachable, stop and identify it — task status alone is not proof that the assembled checkout contains the slice.
- Phase detection: read `Tested implementation HEAD` from `## QA`. A verdict is fresh only when no non-backlog file differs between that revision and the current checkout: `git diff --quiet <tested-head>..HEAD -- . ':(exclude)backlog/**'`, and there are no uncommitted non-backlog changes. Backlog-only planning or QA commits do not stale behavioral evidence. If evidence is fresh and records pass or minor issues, skip to Phase B. If code changed, rerun Phase A and replace the old verdict. If it records a blocking issue, rerun Phase A only after the relevant fixes land; if still unresolved, stop. If the parent is already `Done`, ask whether to re-QA, re-triage, or stop.

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

Write a `## QA` section to the parent task capturing the result — this is how the QA outcome survives into Phase B and beyond, the same way the brief and design are the trail:

```bash
backlog task edit <parent-id> --plain --notes "$(cat <<'EOF'
## QA

Verdict: [pass / issues found]
Tested implementation HEAD: [git rev-parse HEAD for the implementation revision being tested]
Environment: [local/test environment and relevant fixture or dataset]

### Checked
- [Integration flow / seam / adversarial case exercised]

### Issues (omit if none)
- [What's wrong] — [which seam / slice] — [blocking / minor]
EOF
)"
```

If the task already has notes, append `## QA` rather than overwriting them. When rerunning Phase A after a blocking or stale verdict, replace the previous `## QA` section instead of stacking another.

Do not commit the QA record during Phase A. Leave the backlog metadata pending so it can be included in Phase B's final settlement commit. If a blocking issue stops the flow before Phase B, leave the QA record uncommitted and report that clearly to the user. The recorded implementation HEAD intentionally precedes the eventual settlement commit. On re-entry, backlog-only changes or commits are allowed by the freshness check above.

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

- Read the parent: `backlog task view <parent-id> --plain`. Confirm a `## QA` section is present, contains no unresolved blocking issue, and is fresh under A1's tested-HEAD check. If absent or stale, run Phase A first; if blocking, return to Phase A after fixes rather than entering triage + close.
- Reconfirm every child slice is `Done` and its unique slice-ID commit remains reachable from current `HEAD`, using A1's landed check. This catches slices reopened after QA.
- Establish scope: all child slices of the parent (`backlog task list -p <parent-id> --plain`), reading the **`## Friction`** subsection of each slice's `notes`.

#### B2. Inspect the code that shipped

The friction notes are the explicit record. The code is the implicit record—it shows patterns
no individual agent could see because each had only one slice's context. Per-slice review
already swept each slice's own diff in `feature-implement`; this pass is for what only emerges
once the slices sit together.

- Identify the commits for each in-scope slice — `/feature-implement` commits per slice, so `git log --oneline` over the range (or `git log --grep "<slice-id>"`) maps slices to commits. Ask the user for the range if it's unclear.
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

If the user says "fix now": make the change directly and run the targeted tests plus format/lint/type checks appropriate to what changed. Report it in one line. Then **commit the triage fix** as a focused code commit on the convention-appropriate branch that references the parent; exclude pending backlog metadata and never push or open a PR. After the commit, rerun every integration or browser check from Phase A that the change could affect. If it touches auth, trust boundaries, input handling, secrets, or another security-sensitive path, rerun the focused security review too. A failed or blocked recheck prevents closure. Replace the QA record's `Tested implementation HEAD` with the fix commit and update its checked evidence; the final settlement commit in B6 lands that metadata. If the user says not to commit the fix, leave the feature open because QA cannot be bound to landed code.

If the user says "draft", treat that as approval of the proposed change, rationale, and rough cost shown for that item, incorporating any edits they supplied. Save it in B5 without a separate drafting interview or confirmation. If material framing is missing or the user's edits are ambiguous, collect questions for **all affected drafts in one follow-up**; do not interview one item at a time. Preserve the approved framing rather than silently expanding scope.

If the user says "drop" → skip that item. Don't argue.

#### B5. Save drafts

For each item the user chose to draft, create one:

```bash
backlog draft create "<short title>" \
  --labels learning \
  -d "$(cat <<'EOF'
## Friction
[What made this awkward — refined from slice notes, code inspection, QA, and the conversation]

## Proposed change
[What we'd do about it]

## Why it matters
[Cost of leaving it]

## Rough cost
[small / medium / large]

## Surfaced in
- <slice-id> / <file-path> / QA
EOF
)"
```

Drafts live in `backlog/drafts/`, separate from active tasks — explicitly *not yet committed work*. Promote later with `backlog draft promote <id>`.

#### B6. Close the feature

Once QA passed (or its minor issues were triaged and accepted), its evidence is fresh, and friction is triaged, close the parent:

```bash
backlog task edit <parent-id> -s "Done" --plain
```

Commit the parent status, final QA metadata, and any drafts created during triage as one settlement commit that references the parent ID. Include only backlog artifacts from this settle run, confirm the commit succeeded, and report its SHA + subject. Do not push or open a PR. If the commit fails, restore the parent to its prior open status—the feature is not durably closed.

Do **not** close if Phase A left a blocking issue unresolved, QA became stale, a post-fix recheck failed, or any slice commit is not reachable. State the blocker and leave the parent open.

#### B7. Hand off

Report, in this order:

- **QA:** the verdict (pass, or which issues remain and their disposition).
- **Fixed now:** one line per change, with file paths.
- **Drafted:** IDs + titles.
- **Dropped:** items the user acknowledged but didn't act on.
- **Feature:** closed (`Done`) or held open (with why).

End with: *"Run `backlog draft list --plain` to see all open learning drafts. Promote with `backlog draft promote <id>` when one is approved for work."*

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
- ❌ Treating `Done` task statuses as proof that slice commits are integrated into the current checkout.
