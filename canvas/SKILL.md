---
name: canvas
description: Shared infinite tldraw canvas for visual brainstorming with the user — Claude and the user draw on the same board and iterate together. Use when the user wants to sketch, diagram, map, or brainstorm a concept visually, says "let's draw/diagram/sketch this", "put it on a canvas", "whiteboard this", "let's brainstorm visually", or invokes /canvas. Boards are per-project and local.
allowed-tools: Bash(node "$CANVAS":*)
---

# Shared canvas (tldraw)

A local infinite canvas the user and Claude draw on together to brainstorm, built on **tldraw
sync** (real-time multiplayer). The user draws in the browser; Claude draws server-side into the
shared room, and every connected tab updates live. One local Node server per machine; nothing
leaves the user's computer. Boards are stored **per project** under `.claude/canvas/`.

Because it's real multiplayer, **multiple tabs (and multiple people) are fine** — there's one
authoritative board, no duplication. Claude's drawing and structure-reads work even with **no tab
open** (it's server-side); a tab only needs to be open to _see_ the board or refresh the PNG.

## Use the medium — don't dump text

This is a **canvas**, not a slide. If the output would read just as well as a bulleted list, you
haven't used it. The win is **spatial and visual meaning** — things a paragraph can't carry:

- **Encode meaning in space, not sentences.** Position, alignment, and grouping _are_ the
  argument: a left-to-right axis is time/flow, a column is a category, proximity is "belongs
  together", a loop-back arrow is feedback. Lay the idea out so the structure is legible before a
  single label is read.
- **Encode state in form.** Use color, fill, dash, and shape to carry status — green=new/added,
  red/`x-box`=removed, grey/dashed=legacy or absent, solid vs. semi for emphasis. Don't _write_
  "this column was dropped"; **draw it struck out**.
- **Show change as change.** For anything that evolves (a schema, a pipeline, a state machine),
  draw the before→after **snapshots side by side** with the transition on the arrow between them,
  so the reader _sees_ what appears, persists, and disappears.
- **Make arrows do work.** Relationships, dependencies, and flow belong on bound arrows
  (`from`/`to`), not in prose. The graph is the content.
- **Boxes hold labels, not paragraphs.** A few words per shape. Push longer explanation into one
  small caption `text` near the cluster — never stuff a sentence into every box. If a shape needs
  three lines of prose, the diagram is carrying the wrong load.
- **Gut check before drawing:** "What does the _layout_ say if all the text were blurred out?" If
  the answer is "nothing", redesign the visual rather than adding more words.

The CLI is at `bin/canvas.mjs` inside this skill's base directory (shown when the skill loads).
Set it once, then use it for everything:

```bash
CANVAS="<this skill's base dir>/bin/canvas.mjs"     # e.g. ~/.claude-personal/skills/canvas/bin/canvas.mjs
```

## Start here (every session that uses the canvas)

```bash
node "$CANVAS" up
```

`up` is idempotent and self-installing: on first ever run it installs + builds the app (~30s,
once, cached globally), then starts the server for the **current project** and opens a browser
tab. If it's already running it just reports the URL. Tell the user to open the tab so they can
see and draw (multiple tabs are fine).

## The loop

1. Draw or change shapes (`draw`, `clear`, `delete`).
2. **Trust the structured result, don't reflexively render.** `draw` is deterministic and its
   `warnings`/`errors` are authoritative; `diff` shows exactly what changed (yours + the user's).
   Together these confirm placement, sizing, color, overlaps, and arrow routing **without an
   image** — re-rendering to check your own draw landed is wasted tokens (a PNG read costs
   ~10–30× a `diff`).
3. **Read the PNG only for what text can't carry**, and treat it as a deliberate step, not a habit:
   a final **aesthetic/legibility** judgment (is this a *good* diagram?), or to **see what a human
   drew** (freehand strokes summarize as a useless `"draw"` line). If `warnings` is empty and you
   only changed structure, you almost certainly don't need it. `node "$CANVAS" png` prints the path.
4. Hand back to the user; when they say they're done, `diff` again to read their additions.

## Draw

```bash
node "$CANVAS" draw '{"op":"note","x":120,"y":100,"text":"endgame loop","color":"yellow"}'
node "$CANVAS" draw '[{"op":"rect","id":"atlas","x":0,"y":0,"w":240,"h":120,"text":"Atlas","color":"blue"},
                     {"op":"rect","id":"db","x":400,"y":0,"w":240,"h":120,"text":"DB","color":"green"},
                     {"op":"arrow","from":"atlas","to":"db","text":"feeds"}]'   # arrow binds + follows
node "$CANVAS" draw '{"op":"update","id":"atlas","color":"red","dy":60}'   # edit by id
node "$CANVAS" clear
node "$CANVAS" delete atlas      # or: delete shape:abc123
```

| op                 | fields                                                                                                                                       |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `rect` / `ellipse` | `id?, x,y, w?, h?` (omit `h` → auto-fit to text)`, text?, color?, fill?`                                                                     |
| `geo`              | `geo` (cloud/diamond/star/hexagon/heart/triangle/x-box/check-box/…), `id?, x,y, w?, h?` (omit `h` → auto-fit)`, text?, color?, fill?`        |
| `text`             | `id?, x,y, text, color?, size?, w?` (w wraps)                                                                                                |
| `note`             | `id?, x,y, text?, color?`                                                                                                                    |
| `arrow`            | `id?, x1,y1, x2,y2, text?, color?, dash?, bend?` (arc px), `kind?` (arc/elbow), `arrowheadStart?/arrowheadEnd?` · or **bind**: `from?, to?`   |
| `stack`            | `x,y, dir?` (down/right), `gap?, w?, size?, color?, fill?` + `items:[{text, color?, fill?, dash?, size?, w?, h?, id?, op?, geo?}]` — auto-spaced |
| `frame`            | `id?, x,y, w?,h?, name?`                                                                                                                     |
| `shape`            | `shape:{type,x,y,props}` — raw `editor.createShape` partial (power use)                                                                      |
| `update`           | `id` + any of: `x,y` (absolute) / `dx,dy` (relative) / `w,h, text, color, fill, dash, size, align`; arrows also `x1,y1,x2,y2, bend, kind`; frames `name` |
| `delete`           | `id` or `ids:[...]` (deletes those shapes + their bindings)                                                                                  |
| `clear`            | _(no fields)_ — wipe the whole board                                                                                                         |
| `fit`              | _(no fields)_ — fit the viewport to all shapes (client-only)                                                                                 |

- **text never overflows a box — omit `h`**: for `rect`/`ellipse`/`geo`, leaving `h` out
  auto-sizes the box's height to fit its label (wraps to `w`). Pass `h` only when you want an
  exact height (it's respected verbatim — overflow is then on you). So the rule of thumb:
  **set `w` to control the column width, omit `h`, and let the box grow.** Boxes grow _downward_.
- **stacking boxes? use `stack`, don't guess the pitch.** A column/row of boxes (table rows, a
  legend, a palette) is the #1 source of overlap — auto-fit makes each box's height unknown until
  it's drawn, so a hand-picked `y` pitch overlaps. `stack` lays out `items` in a column
  (`dir:"down"`) or row (`dir:"right"`), advancing past each box's _real_ computed height plus
  `gap`, so they **never overlap**. Give an item an `id` to bind arrows to it later. Example:
  `{"op":"stack","x":40,"y":120,"w":210,"gap":12,"items":[{"text":"id"},{"text":"email"},{"text":"+ role","color":"green","fill":"semi"}]}`
- **font is fixed per `size` (s/m/l/xl) and does NOT shrink to fit** — bigger text needs a wider
  `w`, not a taller box. Use `size:"s"` for dense diagram labels.
- **arrow labels don't wrap** — a long `text` on an arrow stacks into an unreadable vertical
  sliver. Keep arrow labels to ~1–3 words; put any longer explanation in a nearby `text` shape.
- **give a labeled connector room** — the label sits centered on the arrow's _visible_ shaft (the
  edge-to-edge gap between the two boxes), drawn horizontally. If that gap is shorter than the
  label, the text covers the shaft **and the arrowhead** — the connection reads as floating text
  with no visible direction. Leave a gap bigger than the label along the arrow's axis: roughly
  ≥ one line-height (~50px) for a vertically-stacked pair, or ≥ the label's width for a side-by-side
  pair. When boxes must sit close, drop the arrow label and put the words in a small `text` shape
  beside the arrow instead. The layout check flags this (`arrow #x label … hides the shaft`).
- **stable ids**: pass `"id":"atlas"` on create to name a shape (becomes `shape:atlas`), then
  `update`/`delete` it later by that name — **no read-back round trip**. Omit `id` for an
  auto-generated one. Re-creating with the same id overwrites it (idempotent).
- **connected arrows**: give an arrow `from`/`to` shape ids instead of (or mixed with) raw
  coords — `{"op":"arrow","from":"atlas","to":"db","text":"feeds"}` — and it **binds** to those
  shapes: it routes to their edges and **follows them when they move** (yours or the user's). The
  referenced shapes must already exist (create them earlier in the same batch). `view` shows
  bound ends as `#atlas->#db`, free ends as coords. Deleting a shape also removes arrows' bindings
  to it. (Re-binding an existing arrow via `update` isn't supported yet — delete + recreate.)
- **route arrows around content, don't slice through it.** A bound arrow draws a straight line
  to its target's edge — a long or back-edge arrow (e.g. a feedback loop) will cut across whatever
  sits between. Two fixes: `kind:"elbow"` routes the arrow in right-angle segments (idiomatic for
  flowcharts/branches), and `bend:<px>` bows an arc to one side (sign picks the side; try ±80–120
  for a loop that swings clear). Use these for back-edges and any arrow spanning more than its
  immediate neighbour.
- **`draw` returns `warnings`** alongside `errors` — a geometry check on what you just drew. It
  flags **box overlaps** (`overlap: #a ↔ #b`), **arrows crossing a shape they aren't bound to**
  (`arrow #x crosses #y`), **labeled arrows whose label hides the shaft** (`arrow #x label …
  hides the shaft` — the gap between the bound boxes is too small for the label), and **frames
  colliding** (`frames overlap: #a ↔ #b` — usually a frame
  grown to fit its content has run into a neighbour; shrink it or move it, a box _inside_ a frame
  is fine). The crossing check traces the arrow's **actual route** — straight, `bend` arc, and
  `elbow` paths are all checked (an elbow is only flagged if it can't dodge the shape either way),
  so a bent loop that still clips a box is caught. Treat a non-empty `warnings` as "fix before
  handing back": re-`stack`, nudge with `update`, or `bend`/elbow the arrow. Pre-existing shapes
  you didn't touch this batch are never re-flagged.
- **`update`** only touches the fields you pass; everything else is preserved. An invalid field
  for a shape type fails gracefully (logged to `errors`) without disturbing the rest of the batch.
- **colors**: black blue green grey light-blue light-green light-red light-violet orange red violet white yellow
- **sizes**: s m l xl · **fills**: none semi solid pattern fill
- Invalid values fail gracefully (logged to `errors`), and don't affect other shapes in the batch.

**Quote-safe input** — when shape text contains apostrophes or quotes, pipe the JSON via stdin
instead of fighting shell escaping:

```bash
node "$CANVAS" draw - <<'JSON'
{"op":"note","x":0,"y":0,"text":"it's a \"shared\" board"}
JSON
```

## Read (token-efficient — important on big boards)

```bash
node "$CANVAS" diff              # only what changed since last diff  ← default way to look
node "$CANVAS" stats             # shape counts by type (tiny)
node "$CANVAS" view              # full summary, one line per shape (positions are absolute)
node "$CANVAS" view --type note  # or --grep <text>
node "$CANVAS" count | errors | expect <n>
```

The server writes the snapshot to `.claude/canvas/canvas.json` and the summary to `canvas.txt`
(both work with no tab open). Prefer `diff`/`stats`; the PNG (capped ~1500px) is for an aesthetic
judgment or reading a human's freehand — **not** for verifying your own structural draw (see The
loop). Note the **PNG only refreshes while a tab is open** (a connected client renders it). After
posting, `expect <n>` polls until the board reports n shapes (~1s).

## Lifecycle

```bash
node "$CANVAS" status            # running? which project? shape + tab count
node "$CANVAS" open              # reopen a tab if the user closed it
node "$CANVAS" down              # stop the server (also auto-stops after ~30 min idle)
```

## Gotchas

- **Multiple tabs are fine** (it's real multiplayer) — no duplication. `open` adds another viewer.
- Drawing + `diff`/`stats`/`view` work with **no tab open** and are authoritative. The **PNG only
  refreshes while a tab is open AND foregrounded** (browsers throttle the export timer in background
  tabs) — so verify with `diff`/`view`, and treat a stale PNG as "tab backgrounded", not "draw failed".
- One server at a time: running `up` in a different project restarts it for that project (each
  project keeps its own board under `.claude/canvas/`).
- If `draw` reports `errors`, check `node "$CANVAS" errors` (invalid color/geo/etc.).
