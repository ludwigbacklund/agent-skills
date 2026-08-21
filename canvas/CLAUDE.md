# CLAUDE.md — working on the canvas skill

This file is for an agent **developing this skill**. It is *not* the canvas usage guide — that's
[`SKILL.md`](./SKILL.md) (instructions for an agent *drawing on* a canvas). Don't confuse them.

## What this repo is

The single **source of truth** for the `canvas` skill. It's symlinked into both
`~/.claude/skills/canvas` and `~/.claude-personal/skills/canvas`, so edits here apply everywhere the
skill loads. See `README.md` for architecture and data flow. The pieces:

- `bin/canvas.mjs` — the CLI (lifecycle + draw + read). Owns `APP_VERSION` and the runtime install.
- `app/server.mjs` — the `http`+`ws` server: one `TLSocketRoom`, `/api/draw`, debounced persist.
- `app/shapes.mjs` — `applyCommands` (hand-built tldraw records) + `summarize` (the text view).
- `app/src/App.jsx` — the tldraw client + PNG export.

## The one rule that bites: bump APP_VERSION

The runtime at `~/.claude-canvas` is a **built copy** of `app/`, rebuilt by `canvas up` only when
`APP_VERSION` (top of `bin/canvas.mjs`) changes. **If you edit anything under `app/` and don't bump
`APP_VERSION`, your change won't take effect** — `up` reuses the stale build. After any `app/` edit:

1. Bump `APP_VERSION` in `bin/canvas.mjs`.
2. `node "$CANVAS" up --no-open` triggers a clean reinstall + rebuild (~30s).

`bin/canvas.mjs` itself runs from source (not the runtime), so CLI-only changes don't need a bump —
but bump anyway if a CLI change pairs with an `app/` change. Use `git status` to never lose track of
an un-bumped edit.

## How to test (do it yourself — don't make the user)

```bash
CANVAS=~/code/canvas/bin/canvas.mjs

( cd /tmp/scratch && node "$CANVAS" up --no-open )          # start, no GUI hijack
agent-browser --session dev open http://127.0.0.1:5179/     # be the "user tab" — a session YOU own
node "$CANVAS" draw '...'; node "$CANVAS" expect <n>; node "$CANVAS" diff   # draw + verify
node "$CANVAS" png                                          # prints PNG path → read it
agent-browser --session dev close                           # close ONLY your own sessions
node "$CANVAS" down                                         # stop (kills by stored pid)
```

- Reads (`view`/`diff`/`stats`) are authoritative and work with **no tab open**. The **PNG only
  refreshes while a tab is open and foregrounded** — verify draws with `diff`/`view`, not the PNG.
- Always wait for a render with `expect <n>`, never a bare `count`.

## Hard gotchas (don't relearn)

- **Never** `lsof -ti tcp:PORT | xargs kill` — it kills the user's connected **browser tab** too.
  Stop with `canvas down`, or `lsof -ti tcp:PORT -sTCP:LISTEN` (listener only) if you must.
- **Real waits only.** `node -e "setTimeout(()=>{},1500)"`. `read -t N </dev/null` returns
  instantly; the `sleep` binary is blocked. To wait for a render, use `expect <n>`.
- **Don't `rm -rf ~/.claude-canvas`** — a guard blocks rm-rf on home paths. Bump `APP_VERSION` to
  force a clean rebuild instead.
- **Never `import 'tldraw'` in Node** — the meta-package needs a DOM and hangs. Use the node-safe
  `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/sync-core` (how `server.mjs`/`shapes.mjs` work).
- **Records are hand-built** from tldraw 5.1.0's exact `getDefaultProps()` (pinned via
  `package-lock.json`). New shape/binding props must be verified against the real schema validator
  (`createTLSchema().types.<t>.validate(record)`) before trusting them. Re-verify on any tldraw bump.
- `room.updateStore`/`getCurrentSnapshot` are `@deprecated` in 5.1.0 but correct for this local tool.

## Conventions

- Match the existing terse, comment-dense style in `shapes.mjs`/`server.mjs` — dense one-liners with
  a short "why" comment, not verbose multi-line expansions.
- Invalid `draw` input must **fail gracefully** (logged to `errors`) without poisoning the rest of
  the batch — keep new ops inside the per-command try/catch.
- Commit as you go; keep the history a reliable record (this repo's git is what ended the
  "did I already bump the version?" confusion of the old two-copy setup).
</content>
