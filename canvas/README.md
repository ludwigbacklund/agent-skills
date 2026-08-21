# canvas — a shared tldraw whiteboard for Claude Code

A local, per-project infinite canvas that a human and a Claude Code agent draw on **together**.
The human draws in a browser; the agent draws server-side by posting high-level commands. Built on
[tldraw](https://tldraw.dev) 5.1.0 + **tldraw sync** (real-time multiplayer), so any number of tabs
stay in sync against one authoritative board — no duplication, no executor lock. Everything runs
locally; nothing leaves the machine.

This repo is the **source of truth** for the skill. It is symlinked into the Claude skills dirs
(see [Layout](#layout)), so editing here updates every place the skill is loaded.

## What it can do

- **Agent draws without a browser.** `POST /api/draw` → `room.updateStore(...)`; structure reads
  (`view`/`diff`/`stats`) are derived server-side and work with no tab open.
- **Live multiplayer.** Human + agent edits converge in real time across tabs/people.
- **Rich command vocabulary.** `rect ellipse geo text note arrow frame shape update delete clear fit`
  — with stable ids, arrow→shape **bindings** (arrows follow shapes), auto-fit box height,
  relative/absolute moves, restyle/relabel by id, and quote-safe stdin input.
- **Token-efficient reads** for big boards: `diff` (only what changed), `stats`, filtered `view`.
- **PNG export** so the agent can *see* the layout (refreshed by any connected tab).

See [`SKILL.md`](./SKILL.md) for the full command reference (that file is the agent-facing
instruction set loaded when the skill runs).

## Architecture

One Node process per machine hosts the board; the browser is a thin tldraw client.

| File | Role |
|------|------|
| `bin/canvas.mjs` | The CLI: lifecycle (`up`/`down`/`status`/`open`), drawing (`draw`/`clear`/`delete`), reads (`diff`/`view`/`stats`/`count`/`expect`/`errors`/`png`). On first run it installs + builds the client into the runtime dir; `up` spawns the server detached and records `state.json`. |
| `app/server.mjs` | Standalone `http` + `ws` server. Hosts one `TLSocketRoom`. `POST /api/draw` applies commands; `onDataChange` debounce-persists the snapshot (`canvas.json`) + summary (`canvas.txt`). `WebSocketServer` on the same server → `handleSocketConnect`. `PUT /api/snapshot` receives the client PNG. Serves the built client from `dist/`. Binds `127.0.0.1` only; idle-exits after `CANVAS_IDLE_MIN` (default 30) with 0 tabs. |
| `app/shapes.mjs` | `applyCommands(store, cmds)` hand-builds full tldraw **records** (no Editor) using tldraw 5.1.0's exact `getDefaultProps()` values + overrides, each command isolated in try/catch. `summarize(snapshot)` produces the token-efficient text view (absolute coords; arrow endpoints; bound ends shown as `#target`). |
| `app/src/App.jsx` | `const store = useSync({uri})` → `<Tldraw store onMount=setupExport>`. The export listener debounce-uploads a capped (~1500px) PNG. |

### Data flow

```
agent ──POST /api/draw──▶ server ──room.updateStore(applyCommands)──▶ TLSocketRoom
                                          │                                │
                          onDataChange (debounced)                    sync ws
                                          ▼                                ▼
                        canvas.json + canvas.txt (reads)          browser tabs (live)
                                                                         │
                              canvas.png ◀──PUT /api/snapshot────────────┘ (any tab renders)
```

## Layout

Three locations, by design:

```
~/code/canvas/                          ← THIS REPO (source of truth, git). Edit here.
~/.claude/skills/canvas          → ~/code/canvas   (symlink)
~/.claude-personal/skills/canvas → ~/code/canvas   (symlink)
~/.claude-canvas/                       ← built RUNTIME: a copy of app/ with node_modules + dist,
                                          plus state.json, server.log, VERSION. Rebuilt by `up`
                                          whenever APP_VERSION (in bin/canvas.mjs) changes.
<project>/.claude/canvas/               ← BOARD DATA per project: canvas.json (snapshot),
                                          canvas.txt (summary), canvas.png, errors.log. Auto-gitignored.
```

Why symlinks: a single source avoids the failure mode of two diverged copies both claiming the same
`APP_VERSION` while sharing one runtime — which silently skips the rebuild. Edit the repo, and every
place the skill loads sees it.

## Develop

```bash
CANVAS=~/code/canvas/bin/canvas.mjs

# start WITHOUT opening a browser (don't hijack the user's GUI), from any project dir
( cd /tmp/scratch && node "$CANVAS" up --no-open )

# act as a "user tab" via the agent-browser skill, in a session you own
agent-browser --session dev open http://127.0.0.1:5179/

# draw, then verify
node "$CANVAS" draw '{"op":"rect","id":"a","x":0,"y":0,"text":"hello"}'
node "$CANVAS" expect 1      # waits for the render to report N shapes
node "$CANVAS" diff          # cheapest way to see what changed
node "$CANVAS" png           # prints the PNG path; read it with your image viewer

node "$CANVAS" down          # stop the server (kills by stored pid)
```

**After editing anything in `app/`, bump `APP_VERSION` in `bin/canvas.mjs`** — otherwise the next
`up` reuses the stale built runtime (the version is the rebuild gate). `git status` makes an
un-bumped app change easy to catch before it bites you.

To upgrade tldraw: bump the dep, then **re-verify the hand-built defaults** in `app/shapes.mjs`
against the new `getDefaultProps()` (and the arrow binding props against the schema validator) —
they're pinned to 5.1.0's exact values via `package-lock.json`.

## Gotchas (don't relearn these)

- **Never** free the port with `lsof -ti tcp:PORT | xargs kill` — that kills *every* process with a
  socket on that port, **including the user's connected browser tab**. Stop with `canvas down`, or
  `lsof -ti tcp:PORT -sTCP:LISTEN` (listener only).
- **Don't `rm -rf ~/.claude-canvas`** to reset the runtime — a safety guard blocks rm-rf on home
  paths. Bump `APP_VERSION` instead; `ensureRuntime` then wipes + rebuilds its own dir.
- **Importing the `tldraw` meta-package in Node hangs** (it needs a DOM). `@tldraw/tlschema`,
  `@tldraw/utils`, and `@tldraw/sync-core` are node-safe — that's how the server builds records.
- **The PNG only refreshes while a tab is open AND foregrounded** (browsers throttle background-tab
  timers). A stale PNG means "tab backgrounded", not "draw failed" — verify with `diff`/`view`.
- `room.updateStore` / `getCurrentSnapshot` are marked `@deprecated` in 5.1.0 (in favour of a
  pluggable storage backend) but work and match tldraw's own server examples — fine for a local tool.

## License / scope

Personal tool, local-only, macOS-tested. Not packaged for distribution yet (no marketplace plugin,
no cross-platform verification of browser-open / process-kill on Linux/Windows).
</content>
</invoke>
