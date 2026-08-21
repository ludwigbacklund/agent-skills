---
name: persona-interview
description: Run a problem-discovery interview with one or more personas from a /persona-create trio. The user asks open-ended questions; personas respond in character with their archetype's posture, tool history, and resistance moves. Output is a saved transcript + synthesis (new evidence, persona updates, real-user questions). Use before /feature-spec to stress-test a problem, or after to interrogate a brief. Triggers include "interview the personas", "interview <name>", "let's stress-test this problem", or an explicit /persona-interview invocation.
---

# /persona-interview — Problem-discovery interview with personas

Run a hypothetical-problem interview with one or more personas. The user asks; the personas answer *in character*. The skill's value is forcing the user to articulate the problem in interview-shaped questions and watching where the personas push back.

This is **not** a feature-validation tool. The personas are LLM-grounded, not real operators — so any *agreement* is weak signal and any *disagreement* is the load-bearing finding. Treat the synthesis as hypothesis-sharpening, not validation. Real users still required.

## When to use

- User invokes `/persona-interview <segment-slug>` (with optional `--task <id>` or `--topic "..."`).
- After `/persona-create` (the trio must exist).
- Before `/feature-spec`, to stress-test whether the problem is real for these personas.
- After `/feature-spec`, to interrogate the brief before `/feature-design`.
- Skip if you have direct access to real users and the time to interview them — this is the substitute, not the upgrade.

## Process

### 1. Setup

- Take `<segment-slug>` as arg. If missing, ask which segment. Verify `personas/<segment-slug>/` exists.
- Read `README.md`, all three persona files, and `CHALLENGES.md`. The personas' resistance moves, tool history, and `[hypothesis]`/`[guess]` markers are load-bearing — don't skim.
- Establish the topic:
  - `--task <id>` → read the backlog task brief.
  - `--topic "..."` → use directly.
  - Otherwise ask: *"What problem or area are we exploring?"*
- Confirm mode (default: **trio round-robin**):
  - **trio-roundrobin** — each question, all three respond. Best for surfacing disagreement.
  - **sequential** — interview Linnéa fully, then Karin, then Lena. Best for depth.
  - **single \<name\>** — drill into one persona.

### 2. Brief the user on interview discipline

Before the first question, surface the rules. The user is the interviewer — these rules govern *their* questions:

- **Anchor in current behavior**, not hypothetical features. *"How do you handle invoicing today?"* beats *"Would a faster invoicing tool help?"*
- **Frequency-calibrate every pain claim.** *"When did you last hit this? What did you do?"* — vague pain is fake pain.
- **Don't telegraph the feature.** Reveal nothing about what's being built until late, if at all. Otherwise the personas pattern-match to the marketing pitch.
- **Probe specifics over vibes.** "Tell me more" / "What did you do next" / "What did that cost you" beat moving to the next topic.

Offer 3–5 open-ended starter questions tailored to the topic. The user picks one, edits one, or writes their own.

### 3. Run the interview

For each user question, the persona(s) respond following these rules:

- **Stay in voice.** Linnéa is articulate and tech-fluent; Karin is concrete and budget-anxious; Lena is curt and skeptical. Use the persona's actual language register from their file (Swedish phrases, tools they actually use, kr-amounts in their range).
- **Frequency-calibrate spontaneously** when describing pain. Don't say "this is annoying" without "last time was...". Pull from the persona's existing pain-points list when relevant.
- **Push back on leading questions in archetype-appropriate ways.** If the user asks "would this help?", Lena's response is *"Vad är 'detta'? Du har inte sagt vad det kostar."* — not "yes, that sounds useful". Pushback is a feature; preserve it.
- **Keep answers 2–4 sentences.** Real interviewees don't monologue — they need probing. Expand only if the user explicitly asks.
- **Volunteer adjacent context** ~1 in 3 turns — bring up something the user didn't ask about. Real interviewees do this.
- **Refer to evidence, not citations.** *"Min revisor vill se Fortnox-export — han gör allt en gång om året"*, not *"per [^jobs-1]"*. The user already read the persona file.
- **Stay inside the persona's evidence base.** If the persona file doesn't cover X, the persona says *"Det vet jag faktiskt inte"* — they don't invent. This is the most important rule; sycophancy here invalidates the whole interview.

**Trio-mode formatting** — each persona answers in turn, prefixed clearly:

> **Linnéa (enthusiast)**: ...
>
> **Karin (pragmatist)**: ...
>
> **Lena (refusenik)**: ...

Show the disagreement when it's there — don't smooth it.

**Facilitator role (Claude, separate from persona voices)**: between turns, offer *optional* probes the user might ask next. Never auto-advance. Wait for the user to drive the next question.

### 4. Mid-interview reflection

Every ~6 turns, output a short note (clearly separated from persona voices):

- **What's new** — claims surfaced that aren't in the persona files
- **What contradicts** — anything a persona just said that conflicts with their stated profile (sign of drift; re-anchor before continuing)
- **Where they split** — fresh disagreement axes that weren't in the README

Keep it 3–5 lines. Don't break the flow.

### 5. Synthesis (when the user ends)

When the user signals they're done, write a synthesis section covering:

- **New evidence** — claims that should be added to the persona files (which persona, which section, citation if any)
- **Persona drift** — places where what the persona said conflicts with their file; user decides whether to update
- **CHALLENGES additions** — new weakly-evidenced claims the interview produced
- **Design implications for the topic** — where the trio agreed (weak signal) vs disagreed (strong signal — design surface)
- **Questions for real users** — specific things the personas couldn't answer that the user should ask a real operator

### 6. Save

Write transcript to `personas/<segment-slug>/interviews/<YYYY-MM-DD>-<topic-slug>.md`:

```markdown
---
topic: ...
segment: <segment-slug>
mode: trio-roundrobin | sequential | single <name>
personas: [...]
date: <YYYY-MM-DD>
---

# Interview: <topic>

[full transcript]

## Synthesis

[as above]
```

Report back with:
- File path
- Top 2–3 design implications
- Suggested next step: update persona files? run another interview from a different angle? proceed to `/feature-spec`? run `/persona-walkthrough` after building?

## Anti-patterns

- ❌ Leading questions ("Would this help?", "Don't you wish...?"). Anchor in current behavior; reveal the feature late, if at all.
- ❌ Personas warming up to a feature mid-interview without earning it. Real Lena does not become Linnéa over 5 turns. If she does, you're watching sycophancy, not insight.
- ❌ Treating interview output as feature validation. It's hypothesis-sharpening. Where personas agree is weak signal; where they disagree is the design surface.
- ❌ Long persona monologues. 2–4 sentences forces the user to probe — which is where insight lives.
- ❌ Skipping frequency calibration. "X is painful" with no "last time was..." should be probed, not accepted.
- ❌ Auto-advancing through questions. The user is the interviewer; Claude is the facilitator. Never run the interview *for* the user.
- ❌ Smoothing over disagreement in trio mode. Disagreement IS the signal — make it visible.
- ❌ Letting the persona answer outside their evidence base. Confabulation here invalidates the whole exercise — the persona must say "jag vet inte" rather than invent.
- ❌ Citing footnote markers in dialogue (`[^cap-1]`). The persona refers to lived constraints, not citations.
