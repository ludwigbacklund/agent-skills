# Experience packet

For UI work, present the existing rendered-review evidence as one compact, scrollable storyboard. It lets the user review the resulting experience without discovering and clicking through every state. It does not replace browser verification or independent experience judgment.

## Capture during review

- Capture the actual running implementation with safe realistic data, not mockups or a separate demo. Use the existing browser review and rechecks; no extra demonstration run or recording is required.
- Organize panels around the approved primary scenario and walkthrough: starting point, meaningful decisions, feedback, recovery, and outcome. Select useful states, not every click; omit inapplicable states without manufacturing work.
- Include important failure/recovery states and materially different layouts or content conditions in a compact secondary section. Label simulated failures and distinguish observed behavior from untested expectations. Screenshots cannot prove timing, keyboard behavior, persistence, or recovery; accompany them with observations from exercised checks.
- Use a simple Markdown page or the tracker's native equivalent with inline images and captions. No bespoke site or presentation framework. Keep detailed logs and test output linked rather than reproduced.

## Keep it brief

- Lead with a scoped verdict: **slice interaction** for implementation, **whole job** for settlement. Name the scenario or portion exercised and any unverified remainder; do not use an unqualified experience PASS. Keep behavior/test results distinct. Identify expert review versus actual-user testing without implying unperformed testing. Surface any decision needed; make the packet scannable, not a narrative report.
- Let screenshots carry the presentation. Give each panel a short title and one sentence explaining the action and result. Add a behavioral note only when the screenshot cannot show an important verified fact.
- No introduction, implementation recap, repeated verdicts, or descriptions of obvious visual details. Include only material fixes, limitations, and specific questions; omit empty sections.
- Put provenance and detailed check links at the bottom. Keep required review coverage; shorten the prose, not the verification.

## Store in the working repository, untracked; link from the slice

- Store the entire packet (page and assets) in `<working-repo>/.feature-reviews/<slice-key>/`, with `index.md` and a neighboring assets directory. Never commit packet files or images. The existing slice record stores only the link, verdict, and required completion metadata; do not duplicate the packet there.
- Before writing captures, ensure `/.feature-reviews/` is ignored. Reuse an effective existing ignore rule; otherwise append it to the local exclude file resolved with `git rev-parse --git-path info/exclude`, preserving existing entries. Do not change tracked `.gitignore` files solely for this. Verify with `git check-ignore` and check `git ls-files -- .feature-reviews` for already tracked files; if any exist, report the conflict rather than silently untracking or overwriting them. Never force-add packet files.
- Use stable slice keys and reuse the same destination on reruns. For settlement, use a distinct parent-feature key. For a slice spanning repositories, keep one packet in the working repository that owns its tracking record, or the primary implementation repository if tracking is hosted; record that location in the handoff.
- Keep one canonical, evolving packet per slice. Replace superseded panels rather than accumulating version folders; do not delete unrelated artifacts. Ignored files do not travel with commits and may disappear when a worktree is removed or cleaned. Before such cleanup, preserve any still-needed packet in the retained working repository's ignored `.feature-reviews/` folder and update its links; do not claim automatic persistence.
- Local packets are local-only: provide their absolute path in the handoff and label local links accordingly. Do not imply that a hosted issue's readers can access a local file. If shared or remote access is required and no approved artifact host exists, ask for a destination; do not silently upload, introduce hosting, or fall back to committing assets. Hosted issue attachments are acceptable when authorized and accessible to the intended reviewers.
- Verify the saved page and its image references in the intended review surface. Temporary browser output and chat attachments alone are not durable storage. Before committing, inspect the diff and staged paths to ensure no packet images or generated packet files entered Git. Apply the shared save/read-back and completion rules to the link and metadata; report storage/access failures rather than claiming delivery.

## Keep it current

- Record the tested implementation revision set (or exact working-tree state), approved-plan reference, reviewer identity, environment, representative data, and reviewed widths. After committing, update the untracked packet with the actual tested implementation commit. In repository-local completion metadata, the containing commit can identify the revision; do not embed a commit's own SHA in itself.
- After changes, re-exercise affected behavior and replace its panels and observations. Reuse unchanged evidence only under the shared QA-freshness rules; do not relabel old captures as newly tested. A new screenshot alone does not refresh the experience verdict.
- Show the current reviewed experience, not a gallery of discarded drafts. Briefly note material findings and verified resolutions. Mark partial or blocked packets explicitly and identify missing coverage.
- Producing the packet adds no general user-approval gate. Surface specific unresolved decisions under the workflow's existing escalation rules.

## Compact template

Use this structure, omitting inapplicable sections and repeating the panel block only where useful:

```markdown
# Experience review — <slice title>

**Slice interaction:** <pass / issues found / blocked; at settlement use Whole job: verified / issues found / blocked>
**Scope:** <original scenario or slice portion exercised; unverified remainder, if any>
**Evidence type:** <expert review and/or actual-user testing, only as performed>
**Decision needed:** <specific question, only if needed>

## Main journey

### <Meaningful state>
![<Descriptive state label>](<durable image reference>)
<One sentence: user action → observed result.>
<Optional short note for important verified behavior not visible in the image.>

## Other important states
<Selected error/recovery, empty/loading, or layout panels using the same format.>

## Notes
<Only material fixes, remaining concerns, or untested behavior; short bullets.>

## Evidence
<Tested revision/state; plan; reviewer; environment, safe data, widths; check links.>
```
