---
name: feature-settle
description: Close out a feature after all slices land by verifying assembled behavior against the brief, running a security review, triaging accumulated friction, and closing the parent task. A clean QA verdict flows into reflective triage; issues pause for user direction. Use after the last slice is implemented. Triggers include "settle this feature", "close out this task ID", "let's wrap up the feature", or an explicit /feature-settle invocation.
---

# /feature-settle — Verify + Reflect + Close (two-phase)

Take a feature whose slices have all landed and settle it: confirm the assembled thing actually behaves the way the brief promised, then reflect on what the build taught you and close the parent out. The two phases are separated by a pause that's gated on the QA verdict — a clean pass flows straight into Phase B; issues stop to ask first. Phase A saves a QA verdict; Phase B triages friction and closes the feature.

This is the closing bracket of the feature pipeline — the counterpart to `/feature-spec` (open the problem) and `/feature-shape` (open the solution). It runs **once per feature, after the last slice is implemented**, on the whole feature at once.

QA and reflection are different modes — exercising a running feature vs. reading code and triaging with a human. The pause between them is **conditional**: it fires when QA surfaces issues, so the human decides before any triage or close, and is skipped when QA comes back clean — no point stopping a green feature. The checkpoint lands where judgment matters without adding ceremony when it doesn't.

## When to use

- User invokes `/feature-settle <parent-id>` (or just `/feature-settle` — then ask which feature).
- Run it **after all child slices of a feature are `Done`/landed**, not after each slice. Per-slice verification already happened inside `/feature-implement`; this is the feature-level pass.
- The skill auto-detects which phase to run based on the parent task's state:
  - No `## QA` section → run **Phase A (QA)**, then pause only if QA found issues (a clean verdict flows straight into Phase B).
  - Has `## QA` but the parent isn't closed → jump straight to **Phase B (triage + close)**.
  - Parent already `Done` → ask whether to re-QA, re-triage, or stop.

## What this skill does NOT do

- **Re-run each slice's acceptance criteria.** `/feature-implement` verified those per slice. Phase A tests the *assembled* feature, not the slices again.
- **Make line-by-line bug-hunting the goal.** Phase A is about *behavior*, not the diff.
  Phase B runs a report-only review of the assembled diff to surface cross-slice cleanup
  candidates for triage, never to auto-fix. A security review of the assembled diff is also
  in scope once per feature, as a distinct exploit-focused lens beyond per-slice review.
- **Auto-fix or auto-create drafts.** Every Phase B action is approved by the human, item by item.
- **Auto-drive the browser.** UI verification is offered and handed off, same rule as `/feature-implement`.
- **Push or open a PR.** Slices already committed via `/feature-implement`'s land step; publishing the branch stays the user's call.

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
- Phase detection: if a `## QA` section already exists, this is a Phase B re-entry — skip to Phase B. If the parent is already `Done`, ask whether to re-QA, re-triage, or stop.
- **Confirm all slices have landed.** If any in-scope slice is not `Done`, stop and say which — settling a feature with unfinished slices is premature.

#### A2. Derive a QA plan

From the brief and the full set of slices, write a short plan — not a doc:

- **The integration flow** — the path across slices a user actually takes, start to finish.
- **The seams** — the specific hand-offs between slices to probe.
- **Adversarial cases** — the error/empty/boundary states, drawn from the brief, that no slice's ACs covered.
- **Migration stack** (only if the feature changed an existing schema/contract) — the feature's migrations applied in order, on realistic data, as one sequence.

Show the plan to the user before exercising anything. This is their chance to add a flow you missed or call one out of scope.

#### A3. Exercise

- Run the full suite once on the integrated whole to catch integration breakage: `pnpm test`, `pnpm tc`, `pnpm lint` (or whatever the project uses). These are a backstop, not the point — the point is behavior.
- For behavior/UI: **do not auto-drive the browser.** Pause and hand off — say what you'd exercise (the integration flow + the adversarial cases from the plan) and let the user choose: drive it themselves, or ask you to run the `agent-browser` skill.
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

### Checked
- [Integration flow / seam / adversarial case exercised]

### Issues (omit if none)
- [What's wrong] — [which seam / slice] — [blocking / minor]
EOF
)"
```

(If the task already has notes, append `## QA` to them rather than overwriting.)

A **blocking** issue means the feature is not done—surface it and stop; it likely needs a fix
slice via `feature-implement` or a scope conversation, not a close-out. Minor issues can be
carried into Phase B triage. An exploitable security-review finding is blocking by default—do
not close a feature over a known live vulnerability.

#### A5. Continue or pause — gated on the verdict

Whether to stop here depends on what QA found. The pause exists to protect the human's judgment when something's off — not to add ceremony when it isn't.

- Confirm the verdict landed (parent ID + pass/issues) and summarize the QA result in 1–2 lines.
- **Clean verdict (pass, no issues)** → **don't pause.** Say QA came back clean and continue straight into Phase B in the same run. Forcing a stop-and-re-invoke on a green feature is ceremony, not protection.
- **Issues found** → **pause.** This is the case the pause is for. Stop and let the user decide before any triage or close:

  > _"QA found [N issue(s)]: [one line each]. Want me to keep going and triage + close, or pause here so you can sit with this first?"_

  - **Wait for the answer.** Don't preview what Phase B would surface. Don't nudge with "I'd recommend continuing."
  - "go" / "continue" / "triage it" → proceed to Phase B in the same conversation.
  - "wait" / "hold" / "later" → stop. They can re-invoke `/feature-settle <parent-id>` whenever they're ready; the skill auto-detects that QA exists and jumps straight to Phase B.
  - A **blocking** issue is a stronger stop: the feature isn't ready to close at all. Surface it and default to holding for a fix slice (`/feature-implement`) or a scope conversation — not a triage-and-close.

---

## Phase B — Reflective triage + close

Walk the human through (a) friction notes that implementing agents left on slice tickets, (b) the code those agents actually wrote, and (c) the issues Phase A surfaced, then for each item agreed to be worth acting on, **either fix it on the spot or capture it as a draft**. Finish by closing the parent feature.

This phase exists because implementation often happens in parallel agents (foreground or fanned out in worktrees), each with its own context that evaporates when it finishes. The friction notes are the explicit record; the code they shipped is the implicit record, where patterns visible only in hindsight (duplicated boilerplate, awkward shapes nobody flagged because each agent only saw one slice) hide. Phase A's "feel" for how the assembled feature behaved is a third source — jank you noticed while exercising it is often friction worth triaging.

### Process

#### B1. Re-entry check

- Read the parent: `backlog task view <parent-id> --plain`. Confirm a `## QA` section is present (Phase A ran). If not, run Phase A first.
- Establish scope: all child slices of the parent (`backlog task list -p <parent-id> --plain`), reading the **`## Friction`** subsection of each slice's `notes`.

#### B2. Inspect the code that shipped

The friction notes are the explicit record. The code is the implicit record—it shows patterns
no individual agent could see because each had only one slice's context. Per-slice review
already swept each slice's own diff in `feature-implement`; this pass is for what only emerges
once the slices sit together.

- Identify the commits for each in-scope slice — `/feature-implement` commits per slice, so `git log --oneline` over the range (or `git log --grep "<slice-id>"`) maps slices to commits. Ask the user for the range if it's unclear.
- **Review the cumulative diff**—the whole feature branch (`git diff <base>..<head>`), not
  one slice. Use the `code-review` skill when available; otherwise perform a focused,
  report-only review of the assembled diff. Do not auto-fix; findings are *candidates* that B4
  triages with the user one at a time. The assembled view should specifically catch reuse,
  duplication, and inconsistencies that per-slice reviews cannot see.
- Then add the few signals a diff-scoped reviewer under-weights, because they're about *consistency between independently-built slices* rather than the quality of any one diff:
  - **Diverging conventions** — two slices solved the same problem different ways. One is probably better; pick or propose a unified approach.
  - **Naming drift** — the same concept named three different ways across slices.
  - **Cross-slice test gaps** — a seam each slice's own tests touched only from its own side, so nothing exercises the hand-off itself.
- Treat each code-review finding and each cross-slice signal as a *candidate friction item* to bring into triage.

#### B3. Aggregate

- Combine three sources: explicit friction from slice notes + hindsight findings from code inspection + the issues/jank Phase A's QA surfaced. Keep provenance (slice ID, file path, or "QA") alongside each item.
- Look for **patterns** — friction flagged in multiple slices, or repeated in the diffs, is the strongest signal. Surface patterns explicitly.
- If nothing surfaced from any source, ask the user directly: *"No friction in notes, nothing jumped out in the diffs, and QA was clean — anything you noticed in hindsight worth flagging now?"*

#### B4. Triage (one item at a time)

For each item present it and ask the user to choose an action:

> **Item:** [what was flagged or noticed]
> **Source:** [slice notes / code inspection / QA / cross-slice pattern]
> **Surfaced in:** [slice id(s), file paths, or QA]
>
> Fix now, capture as draft, or drop?

Default to the **most pragmatic option**:

- **Small + obvious + low-risk → fix now.** Renames, dead code removal, extracting an obvious helper, deleting a stray TODO, tightening a type, fixing a comment. Just do it in this conversation. No ticket overhead.
- **Larger / cross-cutting / needs design → draft.** Refactors that touch many files, new abstractions, anything where the *proposal* needs discussion before someone picks it up.
- **Not worth it → drop.** Acknowledged, not preserved.

If the user says "fix now": make the change directly. Run `pnpm format` / `pnpm lint` / `pnpm tc` as appropriate. Report what you changed in one line per fix. Then **commit the triage fixes** the way `/feature-implement` lands a slice — a focused commit on the feature branch that references the parent — so they don't dangle in the working tree while the feature flips to `Done`. Same rules as the land step: if the user says don't commit, leave the changes for them; never push or open a PR.

If the user says "draft", shape it *together* before saving. Discuss:
- **Proposed change** — what would we actually do about it?
- **Why it matters** — beyond "it was awkward"; what's the cost of leaving it as-is?
- **Rough cost** — small / medium / large effort, ballpark only.

Iterate the draft body with the user until they're happy. **This is not an automated transformation** — the user's framing is the part that makes the draft useful later.

If the user says "drop" → skip and move on. Don't argue.

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

Once QA passed (or its issues were triaged and accepted) and friction is triaged, close the parent — this is the act that's currently missing, where the feature is declared done:

```bash
backlog task edit <parent-id> -s "Done" --plain
```

Do **not** close if Phase A left a blocking issue unresolved. In that case, say so and leave the parent open — the feature needs a fix slice or a scope conversation first.

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
- ❌ Auto-driving the browser. UI verification is offered and handed off, never assumed.
- ❌ Closing the feature from Phase A. Phase A only records a verdict; closing happens in Phase B after triage.
- ❌ Settling a feature whose slices aren't all landed. Stop and say which are unfinished.

**The pause (conditional — see A5):**

- ❌ Pausing on a clean QA verdict. No issues → flow straight into Phase B; the stop-and-re-invoke is ceremony when nothing's wrong.
- ❌ Sliding past *issues* into triage without stopping. When QA surfaced issues, the pause is mandatory — that's the case it exists for.
- ❌ Phrasing the pause question as a nudge. Use the neutral framing in A5.
- ❌ Previewing Phase B's friction items when you do pause. That preempts the user's decision.

**Phase B (triage + close):**

- ❌ Defaulting to "draft" for everything. Small agreed fixes happen in-conversation; tickets have overhead.
- ❌ Fixing things without explicit user approval. "Fix now" is opt-in, item by item.
- ❌ Bundling many small fixes silently. Name each change so the user can veto.
- ❌ Going on a code-inspection spree beyond the feature scope ("while we're here...").
- ❌ Treating raw friction notes, code findings, or QA issues as drafts already. They're observations; the proposal is shaped during triage.
- ❌ Polishing or expanding the user's framing without asking.
- ❌ Pushing back when the user says "drop." Triage means a real chance to discard.
- ❌ Skipping the pattern check or the code inspection. Cross-slice patterns are usually the strongest signal and the reason this phase exists for parallel agents.
- ❌ Closing the parent while a blocking QA issue is unresolved. The feature isn't done.
