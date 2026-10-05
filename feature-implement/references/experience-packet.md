# Optional experience packet

Use selective screenshots or a compact Markdown storyboard when they help the user inspect a journey, compare an important choice, or understand a finding. A runnable interface with concise observations may be enough. Unless the user or project requires a packet, its absence is not a completion blocker. A packet does not replace browser verification or establish usability.

## Show the job

- Lead with the job and what the person can inspect or try, not an expert PASS, test counts, or implementation recap.
- Capture useful states from the running interface with safe representative data during existing checks. No separate demo run or presentation framework is needed.
- Give each panel a short action → observed result caption. Include failure/recovery or narrow layouts only where they explain meaningful behavior or a finding; label induced failures.
- Separate verified behavior, observed experience findings, and unresolved uncertainty. Screenshots cannot prove persistence, timing, keyboard behavior, or recovery. Say whether observations came from expert inspection or actual-user testing.
- Put detailed check links and the tested revision at the bottom. Reuse the canonical record's verification metadata rather than reproducing reports or collecting additional hashes solely for presentation.

## Store and maintain only what is useful

- Follow project artifact conventions; otherwise keep packets and captures under the working repository's ignored `.feature-reviews/<slice-or-parent-key>/`. Never commit generated packets or review images, or upload them without authorization.
- Before capture, reuse an effective ignore rule or append the artifact directory to the local exclude file resolved by `git rev-parse --git-path info/exclude`. Verify with `git check-ignore`; check `git ls-files` for already tracked artifacts and report conflicts rather than silently untracking them.
- Reuse one current packet per slice or parent when needed. Replace superseded panels, preserve unrelated files, and verify image references. Do not build a gallery of discarded drafts.
- Link from the canonical record and handoff using an absolute local path labeled local-only. If shared access is needed, ask for an approved destination; do not imply local files are hosted.
- Keep observations tied to the tested revision under the shared QA-freshness rules. After relevant changes, recheck behavior and refresh affected panels; a new screenshot alone does not verify behavior. Clearly label partial or stale evidence.
- Ignored artifacts do not travel with commits. Before worktree cleanup, preserve still-needed evidence in a retained repository's ignored folder and update links. Do not retain obsolete packets merely as ceremony.

## Optional compact structure

Omit sections that add no useful information:

```markdown
# <Job being reviewed>

Try it: <local URL or reproduction steps; relevant setup>
Scope: <portion exercised and any important remainder>

## Journey
### <Meaningful action or decision>
![<Descriptive state>](assets/<capture>.png)
<Action → observed result.>

## Findings and uncertainty
<Specific findings, resolutions, limits, or a decision needed.>

## Verification
<Behavior checked; expert inspection or actual-user testing; tested revision and detailed check links.>
```

Use the same format for settlement only when an integrated storyboard helps. Existing slice evidence is an input, not proof of the assembled job. Producing a packet adds no approval stage or usability certification.
