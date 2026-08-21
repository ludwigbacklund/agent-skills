---
name: smalldocs
description: Create, open, style, share, or collaborate on Markdown with the global SmallDocs (`sdoc`) CLI, including diagrams, charts, slides, spreadsheets, forms, and guided code walkthroughs. Use when the user says “sdoc it,” “sdoc me the plan,” asks for a smalldoc, wants a polished/shareable Markdown artifact, wants to work interactively on a document, or would benefit from a visual or interactive browser-rendered document.
---

# SmallDocs

Use the globally installed `sdoc` CLI to render local Markdown at <https://smalldocs.org>. A normal local open does not upload the document; content reaches a server only when the user explicitly saves it to SmallDocs cloud or requests `sdoc share`.

## Core workflow

1. Decide whether SmallDocs adds value. Prefer it for documents the user will read, review, share, export, present, or interact with. Skip it for quick Q&A that fits naturally in chat.
2. Write or locate the `.md` file before opening it.
3. For any specialized block, run its reference command with no arguments before authoring the block. Treat the printed syntax as authoritative; do not guess the DSL from memory.
4. Open the result with `sdoc path/to/file.md` unless another mode better matches the request.

## Common commands

- `sdoc file.md` — open a Markdown file for comfortable reading and quick sharing.
- `sdoc bridge file.md` — start collaborative live editing. Browser edits autosave to disk and disk edits push to the page. This command occupies the terminal, so run it in the background if work must continue. On first connection, the user must approve the browser’s Local Network Access / “Apps on device” prompt or the page remains read-only.
- `sdoc library` — open the Markdown library. It indexes `.md` files under the home directory and can filter by directory, date, or tags, but does not search document content; use `rg` or `grep` for content search. Use `.sdocsignore` to exclude a directory or `sdocs-library: false` front matter to exclude a file. Run `sdoc library --help` for details.
- `sdoc library ls --tags` — inspect the current project’s tag vocabulary before tagging, then use `sdoc file.md +tag1 +tag2`. Tag only documents worth rediscovering and reuse existing tags instead of creating synonyms.
- `sdoc share file.md` — create a share link and copy it to the clipboard. Use only when sharing is explicitly requested. The agent cannot deliver the link; tell the user it is on their clipboard so they can paste it into the intended channel.
- `sdoc --help` — consult the current full CLI reference.

## Choose the right artifact

Before writing any of the following, run the corresponding reference command without arguments.

- **Charts:** Run `sdoc charts`, then author a fenced `chart` block. Use when trends or comparisons communicate better visually.
- **Diagrams:** Run `sdoc diagrams`, then author a fenced `mermaid` block. Prefer diagrams for system architecture, flows, sequences, and component relationships.
- **Slides:** Run `sdoc slides`, then author `slide` blocks. Use `sdoc present file.md` to open directly in fullscreen presentation mode. Slides can be exported as PDF or PowerPoint.
- **Spreadsheets:** Run `sdoc cells`, then author fenced `cells` blocks containing CSV-style rows with values and formulas. Use for budgets, projections, totals, and other numbers the user will inspect or adjust. Name blocks to create workbook tabs and allow cross-sheet formulas, then run `sdoc cells verify file.md` to compute the workbook headlessly. Open a CSV directly with `sdoc report.csv`.
- **Code walkthroughs:** Run `sdoc code`. Open source files directly (`sdoc app.py`) for highlighted reading with line numbers, folding, and browser-side review comments. Add guided notes with `sdoc app.py 22:"the bug is here" 25-28:"wrong comparison"`. Pass multiple files and notes in walkthrough order to narrate across files. Use this for code, diffs, MRs, or guided implementation explanations rather than prose documents.
- **Styling:** Run `sdoc schema` before using custom fonts, colors, or spacing. Prefer the defaults unless client-facing polish or a deliberate visual treatment is requested.
- **Interactive feedback:** Run `sdoc feedback` before authoring fenced `form` blocks. Then run `sdoc feedback file.md`; submissions arrive as JSON lines on stdout. Use forms when structured input is more effective than conversational follow-up.

Keep the artifact purposeful: use visual or interactive features only when they improve comprehension or collaboration, not merely because they are available.
