---
name: feature-spec
description: Interview the user to produce a problem brief for a new feature, saved in the project's tracking system. Use when the user invokes /feature-spec, typically as the first step before /feature-shape and /feature-implement. Triggers include "spec out a feature", "let's brief this", "I want to plan a new feature", or an explicit /feature-spec invocation.
---

# /feature-spec — Feature Brief Interview

Conduct a conversational interview with the user to produce a problem brief for a new feature. The goal is full alignment between you and the user on what's being built and why, before any design or code work begins. The output is a parent planning artifact in the project's tracking system.

## When to use

- User invokes `/feature-spec` (with or without a feature name argument).
- Always the first step in the feature pipeline (`/feature-spec` → `/feature-shape` → `/feature-implement` ×N → `/feature-settle`).
- For tiny changes (typo fix, dep bump, single-line config), skip this skill — go straight to implementation.

## Process

### 1. Setup

- **Read `references/tracking-conventions.md` before doing anything else** and follow it throughout this workflow.
- Discover the repository's project instructions, existing planning/tracking conventions, and available tools. Use the existing system; do not introduce a new framework.
- Establish the project tracking mapping described in the reference. It must cover stable artifact references, parent/child hierarchy, dependencies, acceptance criteria, lifecycle state, structured notes/descriptions, drafts and follow-ups, metadata paths, and code-revision evidence. Prefer native tracker features; where unavailable, use explicit links and checklists.
- If the tracker is absent, the conventions conflict, or any mapping is ambiguous, ask the user before proceeding. Do not initialize, install, or invent a tracker or remote command syntax.
- Persist the resolved mapping in existing project documentation when appropriate; otherwise record it in the parent planning artifact once created so later agents can apply the same mapping.
- Get a working title:
  - If the user passed an argument to `/feature-spec`, use it as the working title.
  - Otherwise ask in one sentence: *"What's the feature, in a few words?"*

### 2. Interview

Ask **ONE** question at a time, or a tightly related pair. Each question must be informed by the previous answer — never dump a form.

Cover this ground over the course of the interview, but adapt order and depth to the conversation:

- **Audience** — who specifically is this for? Internal team, end users, a subset, a single stakeholder?
- **Problem** — what's broken or missing today? What does the user do *instead* right now? What's the cost of the workaround?
- **Success** — what's the smallest observable change that means this worked? (Behavior, metric, removed friction — something you could point at.)
- **Constraints** — what can't change? (Data shapes, public APIs, deadlines, compliance, performance budgets, team capacity.)
- **Non-goals** — what's tempting but explicitly out of scope for this iteration?

Probe specifics. "Who is this for?" is generic — "Is this for the support team triaging tickets, or for the customer who filed it?" is useful. Listen for vague terms ("better", "faster", "easier") and ask what they'd measure.

**Reflection-back is the core loop.** After every 2–3 answers, summarize understanding in plain language and let the user correct you:

> So the core problem is *X* for *audience Y*, and we'll know it worked when *Z*. The hard constraint is *C*. Sound right?

**Alignment is reached when the user confirms a full reflection without changes.** Not after a fixed number of rounds. If they keep correcting, keep probing — the corrections show where the misunderstanding is.

### 3. Draft

Once aligned, draft the brief. Use this shape, but **omit any section that wasn't actually discussed** — don't pad:

```markdown
## Problem
[1–2 sentences — what's broken/missing, for whom]

## Why now
[1–2 sentences — what changed, why this matters]

## Success criteria
- [Observable outcome 1]
- [Observable outcome 2]

## Constraints
- [Constraint 1]

## Non-goals
- [Out of scope 1]
```

Show the draft to the user. Ask one question: *"Anything missing, wrong, or padded?"* Iterate until they approve without changes.

### 4. Save

Create the parent planning artifact through the established project tracking mapping. Save the approved brief in the mapped description or structured-note location, together with any mapping details that must live on the parent artifact. Verify that it has a stable reference and can be retrieved by later agents.

Make the new planning artifact durable before handing off:

- For a git-local plan, follow the repository's branch and commit conventions. If they are unclear, ask before changing branches. Commit only planning files created or changed by this invocation; never sweep unrelated working-tree changes into the commit. Reference the parent artifact's stable reference in the commit subject. Do not push or open a PR. If the user asked not to commit, leave it saved locally and explicitly warn that isolated worktrees will not see it until committed and that fan-out must wait.
- For a remote plan, save an approved revision or immutable snapshot that is durably accessible to later agents. Record its revision evidence using the mapping. A git commit is not required unless project conventions require one.

Report back to the user with:
- The parent artifact's stable reference
- Its mapped location or durable link
- The approved planning revision/snapshot evidence (and, for git-local plans, the commit SHA + subject), or that a local plan remains uncommitted
- The natural next step: *"When you're ready, run `/feature-shape <parent-ref>` to design the skeleton and slice it."*

## Anti-patterns

- ❌ Dumping all five interview areas as a form on the first turn.
- ❌ Asking generic questions ("what are your requirements?") instead of probing specifics.
- ❌ Saving the brief before the user has confirmed it.
- ❌ Padding the brief with sections (Why now / Non-goals / etc.) that weren't actually discussed.
- ❌ Treating the interview as a fixed N rounds — stop when aligned, not when a counter hits zero.
- ❌ Initializing or introducing a tracker instead of using the project's established mapping.
- ❌ Accepting vague success criteria ("it should be better"). Push for something observable.
- ❌ Failing to make the approved brief durably accessible before handoff; git-local plans need a selective commit before fan-out, while remote plans need an accessible approved revision or snapshot.
