---
name: persona-create
description: Research, synthesize, and save a trio of project-scoped user personas (enthusiast / pragmatist / refusenik) grounded in primary-source evidence with verbatim quotes. Use when the user wants to sharpen who they're building for before /feature-spec, or to prepare personas for /persona-interview and /persona-walkthrough. Triggers include "create personas for X", "research who uses Y", "build personas for this app", or an explicit /persona-create invocation.
---

# /persona-create — Research-grounded persona trio

Build three personas for a user segment — **enthusiast**, **pragmatist**, **refusenik** — grounded in primary research. The trio's job is *structural disagreement*: each archetype reacts differently, so when they agree it's signal, and where they split surfaces real design tensions.

The skill is **not** a persona generator. It is a research workflow that ends in three persona files. Inventing details that aren't in the evidence is the failure mode this skill exists to prevent.

## When to use

- User invokes `/persona-create` (with or without a segment name).
- Useful before `/feature-spec` to sharpen the audience question.
- Required before `/persona-interview` and `/persona-walkthrough` (those skills consume persona files).
- Skip if the audience is fully internal (e.g. yourselves) — the lift isn't worth it.

## Process

### 1. Brief (interactive interview)

Ask **ONE** question at a time. Cover this ground but adapt to the conversation:

- **Segment** — who specifically? Role, business size, geography. *"Solo dog walkers in cities" is different from "10-employee daycare operators in suburbs."*
- **Disqualifiers** — who is *not* the user? Sharpens the segment.
- **Product context** — what app or feature will these personas react to? Personas without product context drift into generic demographics.
- **Existing beliefs** — what does the user already think about this segment? Surfaces assumptions to either confirm or stress-test.

Reflect back after 2–3 answers. Lock the brief before moving on.

### 2. Source mapping (interactive — **do not fetch yet**)

Walk through this seven-question heuristic and propose specific sources for *this* segment. Show the list and ask the user to prune/add. Reddit is one source among many — for offline-heavy segments (kennels, contractors, surgeons), it's often a thin one.

- **Where do they vent?** → Reddit, FB groups, niche forums, **competitor product reviews** (Capterra, G2, App Store, Trustpilot)
- **Where do they brag?** → Instagram, LinkedIn, conferences, podcasts they go on
- **Who watches them?** → customers (Yelp/Google reviews of *their* business), employees (Glassdoor/Indeed), regulators
- **What do they buy?** → competitor SaaS reviews, hardware/equipment they mention
- **What do they read/listen to?** → trade press, podcasts, YouTube channels
- **What do they hire for?** → job postings reveal staffing model + tools mentioned as required
- **What rules govern them?** → licensing, insurance, compliance docs surface real friction

Tag each proposed source as **direct** (the segment's own words) or **adjacent** (others talking about them), and estimate signal density (high/med/low). The user is the domain expert — they'll know which sources are dead and which are gold.

**Pause. Get the user's approval on the pruned source list before any fetching.**

### 3. Gather

For each approved source:

- **Reddit** → use the `reddit` skill (`scripts/reddit.py search` then `thread`).
- **Capterra / G2 / Yelp / sites that block fetch** → use the `agent-browser` skill to navigate and extract quotes.
- **Trade press, blogs, public pages** → `WebFetch`.
- **Discovery ("find me FB groups about X")** → `WebSearch`.

Save raw evidence to `personas/<segment-slug>/research/<source-slug>.md`. Each file contains: source URL, date fetched, and a list of **verbatim quotes** with surrounding context. Don't summarize away — the verbatim surface texture is what makes the persona feel real later.

Be token-conscious: 3 high-signal sources beat 15 thin ones. Once a source is paying out, prefer depth over breadth.

### 4. Synthesize the trio

Build three personas, each with a distinct skeptical posture:

- **Enthusiast** — early adopter, will try new tools. Still complains about *specific* things (real enthusiasts always do).
- **Pragmatist** — needs ROI proof, asks about onboarding cost and migration. Won't switch without a clear win.
- **Refusenik** — happy with the status quo (paper, spreadsheets, the old tool). You have to pry them off it. Their objections are the hardest design tests.

Each persona file at `personas/<segment-slug>/<archetype>-<name-slug>.md` uses this shape:

```markdown
---
name: <Name>
archetype: enthusiast | pragmatist | refusenik
segment: <segment-slug>
created: <YYYY-MM-DD>
confidence: high | medium | low
---

# <Name> — <archetype>

## Snapshot
[2-3 sentence elevator pitch — who they are, what they care about]

## Identity
- **Role**: ...
- **Business**: [size, shape, location]
- **Years in role**: ...
- **Tech comfort**: ...

## Current workflow
[Concrete daily/weekly steps — what they actually do today, what tools they use, what's on paper vs digital]

## Tool history
- **Currently using**: <tool> — because <reason>
- **Tried and abandoned**: <tool> — because <reason>
- **Refused to try**: <tool> — because <reason>

## What they value / what they resist
- Values: ...
- Resists: ...

## Pain points (with frequency calibration)
- **<pain>** — frequency: <daily|weekly|monthly|rarely>; last occurrence: <when>; current workaround: <what>

## Money
- **Pays today**: ...
- **Would pay for relief**: ...
- **Would never pay for**: ...

## Resistance moves
[Specific objections this persona raises to a new feature. Refusenik should have the sharpest list.]

## Quotes
- "..." [^1]
- "..." [^2]

## Citations
[^1]: research/<source-slug>.md — <quote-id or section>
```

**Citation discipline:**
- Every concrete claim cites a source via footnote.
- Anything you couldn't cite gets marked `[guess]` inline. Don't silently invent — including persona color (family names, anställda, towns, opening years). If it's invented, it's `[guess]`.
- For claims **hypothesized from** source patterns rather than evidenced by them — e.g. "Swedish Karin won't tolerate per-seat pricing because Anglo Capterra reviewers complain about it" — mark `[hypothesis]` and add the claim to `CHALLENGES.md`. Don't paper over the inference chain with a footnote that points at the trigger source. The footnote format implies "this source supports this claim"; if the source only *triggered* the claim, the footnote is misleading.
- A persona dominated by `[guess]` or `[hypothesis]` markers gets `confidence: low` in frontmatter.

### 5. Skepticism check (before saving)

Run this litmus test on the trio. Iterate before saving:

- **Disagreement check** — do the three actually disagree on the feature/product? If they all sound positive, the refusenik isn't doing its job. Make it pricklier with specific objections.
- **Sycophancy check** — does the enthusiast still complain about specific things? A persona that loves everything is fiction.
- **Distinctness check** — could you swap pragmatist and refusenik without anyone noticing? If yes, sharpen the difference.
- **Evidence check** — what's the cited-claim to `[guess]` ratio per persona? Lower confidence accordingly and tell the user.
- **Coherence check** — do tools, workflow, and money match the segment? A solo dog walker probably doesn't have a $400/month SaaS budget.
- **Citation-fit check** — for each footnote, ask: does the cited source actually evidence *this* claim, or is it being used as authority-by-association? An Anglo Capterra reviewer's quote is evidence for *what English-speaking operators say*; it's a hypothesis about what Swedish operators believe. If a citation is laundering an inference, demote the claim to `[hypothesis]` and move it to CHALLENGES.

### 6. Save and report

Write the per-segment files:

```
personas/<segment-slug>/
  README.md                          # trio overview + source list + open questions
  enthusiast-<name>.md
  pragmatist-<name>.md
  refusenik-<name>.md
  CHALLENGES.md                      # weakly-evidenced claims to validate with real users
  research/
    <source-slug>.md
    ...
```

`README.md` shape:

```markdown
# <Segment> personas

## Trio at a glance
- [Enthusiast: <Name>](enthusiast-<name>.md) — <one-line hook>
- [Pragmatist: <Name>](pragmatist-<name>.md) — <one-line hook>
- [Refusenik: <Name>](refusenik-<name>.md) — <one-line hook>

## Sources
- [direct] <source> — <signal density>
- [adjacent] <source> — <signal density>

## Where they disagree
[The 2-4 axes where the trio actually splits. This is the design surface.]
```

`CHALLENGES.md` lists every weakly-evidenced claim across the trio — assumptions the user should validate with one real conversation before relying on these personas. This is the honest part of confidence-honesty; if it's empty, you're probably overclaiming.

Report back with:
- The segment directory path
- The trio names + one-line archetype summaries
- The total `[guess]` count and top 3 entries in `CHALLENGES.md`
- Next step: *"Run `/persona-interview <segment-slug>` to interview these personas about a problem, or `/persona-walkthrough <segment-slug>` for a post-build user test."*

## Anti-patterns

- ❌ Skipping source mapping and synthesizing from general knowledge. The whole point is grounded research.
- ❌ Wishful sourcing — listing FB groups, subreddits, or trade pubs that don't actually exist or have no content. Verify before fetching.
- ❌ Defaulting to Reddit. For offline-heavy segments, competitor reviews on Capterra/G2 and FB groups usually carry more signal.
- ❌ Personas that all agree. The trio is the skepticism mechanism; if they don't disagree, they're failing their job.
- ❌ Summarizing quotes during gathering. Keep them verbatim — surface texture is the point.
- ❌ Inventing details to round out a persona. Mark `[guess]` instead — including persona color like husbands, anställda names, specific towns, opening years.
- ❌ Citation laundering — using a footnoted source to back a claim it doesn't actually evidence (e.g. an Anglo Capterra quote backing a Swedish persona's mental model). If the source only *triggered* the inference rather than evidencing it, mark `[hypothesis]` and add to CHALLENGES.
- ❌ Fetching before the user approves the source list.
- ❌ Saving without showing the trio summary first.
- ❌ Padding sections with no evidence. Empty sections lie; collapse or omit them.
