---
name: feature-spec
description: Interview the user to produce a problem brief for a new feature, saved as a task in the local Backlog.md tracker. Use when the user invokes /feature-spec, typically as the first step before /feature-shape and /feature-implement. Triggers include "spec out a feature", "let's brief this", "I want to plan a new feature", or an explicit /feature-spec invocation.
---

# /feature-spec — Feature Brief Interview

Conduct a conversational interview with the user to produce a problem brief for a new feature. The goal is full alignment between you and the user on what's being built and why, before any design or code work begins. The output is a task in the local Backlog.md tracker.

## When to use

- User invokes `/feature-spec` (with or without a feature name argument).
- Always the first step in the feature pipeline (`/feature-spec` → `/feature-shape` → `/feature-implement` ×N → `/feature-settle`).
- For tiny changes (typo fix, dep bump, single-line config), skip this skill — go straight to implementation.

## Process

### 1. Setup

- Verify `backlog` CLI is available: `which backlog`. If missing, stop and tell the user to install it from https://github.com/MrLesk/Backlog.md.
- Check whether the repo is initialized: `test -d backlog`. If not, ask the user if you should run `backlog init` before continuing. Do not run it without confirmation.
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

Create the task with the brief as its description:

```bash
backlog task create "<title>" --plain -d "$(cat <<'EOF'
<brief markdown body>
EOF
)"
```

Use the heredoc form so newlines and markdown survive. The `--plain` flag makes the output parseable so you can extract the task ID.

Report back to the user with:
- The task ID (e.g. `task-12`)
- The file path under `backlog/tasks/`
- The natural next step: *"When you're ready, run `/feature-shape <task-id>` to design the skeleton and slice it."*

## Anti-patterns

- ❌ Dumping all five interview areas as a form on the first turn.
- ❌ Asking generic questions ("what are your requirements?") instead of probing specifics.
- ❌ Saving the brief before the user has confirmed it.
- ❌ Padding the brief with sections (Why now / Non-goals / etc.) that weren't actually discussed.
- ❌ Treating the interview as a fixed N rounds — stop when aligned, not when a counter hits zero.
- ❌ Running `backlog init` without asking first — it modifies the repo.
- ❌ Accepting vague success criteria ("it should be better"). Push for something observable.
