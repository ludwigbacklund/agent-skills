#!/usr/bin/env node
// Unified CLI for the shared tldraw canvas skill: lifecycle + drawing + reading.
//
// LIFECYCLE
//   canvas up                 install (first run) + start server for THIS project, open a tab
//   canvas status             is it running? where? how many shapes?
//   canvas down               stop the server
//   canvas open               (re)open a browser tab to the running canvas
//
// DRAW
//   canvas draw '<json>'      post a command (object) or batch (array)
//   canvas draw -             read the JSON from stdin (heredoc/pipe — quote-safe for text)
//   canvas clear              wipe the page        canvas delete <id>
//
// READ  (token-efficient — prefer diff/stats over view on big boards)
//   canvas diff               only what changed since the last diff   ← cheapest iteration
//   canvas stats              shape counts by type
//   canvas view [--type t] [--grep s]
//   canvas count | expect <n> | errors
//
// Command vocabulary (ops): rect, ellipse, geo, text, note, arrow, frame, shape, update, delete, clear, fit
//   stable ids: pass "id":"atlas" on create to name a shape, then target it later with
//               {"op":"update","id":"atlas",...} or delete — no read-back needed.
//   bound arrows: {"op":"arrow","from":"atlas","to":"db"} attaches to those shapes and
//                 follows them when moved (referenced shapes must already exist).
//   colors: black blue green grey light-blue light-green light-red light-violet orange red violet white yellow
//   sizes:  s m l xl     fills: none semi solid pattern fill
import { promises as fs, existsSync, readFileSync } from 'node:fs'
import { spawn, spawnSync, execSync } from 'node:child_process'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

process.stdout.on('error', (e) => { if (e.code === 'EPIPE') process.exit(0) })

const APP_VERSION = '10'                                  // bump to force runtime reinstall
const HERE = path.dirname(fileURLToPath(import.meta.url))
const SKILL_APP = path.resolve(HERE, '..', 'app')         // bundled web app (no node_modules)
const RUNTIME = path.join(os.homedir(), '.claude-canvas') // installed copy + state live here
const RUNTIME_APP = path.join(RUNTIME, 'app')
const STATE = path.join(RUNTIME, 'state.json')
const VFILE = path.join(RUNTIME, 'VERSION')
const LOG = path.join(RUNTIME, 'server.log')
const DEFAULT_PORT = Number(process.env.CANVAS_PORT) || 5179

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const sh = (cmd, args, opts) => spawnSync(cmd, args, { stdio: 'inherit', shell: true, ...opts })

// ---------- project + data dir ----------
function projectRoot() {
  try { return execSync('git rev-parse --show-toplevel', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() }
  catch { return process.cwd() }
}
const dataDirFor = (root) => path.join(root, '.claude', 'canvas')

// ---------- state ----------
async function readState() { try { return JSON.parse(await fs.readFile(STATE, 'utf8')) } catch { return null } }
async function writeState(s) { await fs.mkdir(RUNTIME, { recursive: true }); await fs.writeFile(STATE, JSON.stringify(s, null, 2)) }
async function clearState() { try { await fs.unlink(STATE) } catch {} }

// ---------- server liveness ----------
async function health(port) {
  try {
    const r = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(800) })
    return r.ok ? await r.json() : null
  } catch { return null }
}
async function portFree(port) { return (await health(port)) === null && !(await anyServer(port)) }
async function anyServer(port) {
  try { await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(500) }); return true } catch { return false }
}
async function pickPort(start) {
  for (let p = start; p < start + 40; p++) if (await portFree(p)) return p
  throw new Error('no free port near ' + start)
}

// ---------- install ----------
async function ensureRuntime() {
  const have = existsSync(VFILE) ? readFileSync(VFILE, 'utf8').trim() : null
  if (have === APP_VERSION && existsSync(path.join(RUNTIME_APP, 'node_modules')) && existsSync(path.join(RUNTIME_APP, 'dist'))) return
  process.stderr.write('[canvas] installing runtime (first run, ~30s)…\n')
  await fs.rm(RUNTIME_APP, { recursive: true, force: true })
  await fs.mkdir(RUNTIME, { recursive: true })
  await fs.cp(SKILL_APP, RUNTIME_APP, { recursive: true })
  let r = sh('npm', ['ci'], { cwd: RUNTIME_APP })
  if (r.status !== 0) r = sh('npm', ['install'], { cwd: RUNTIME_APP })
  if (r.status !== 0) throw new Error('npm install failed in ' + RUNTIME_APP)
  process.stderr.write('[canvas] building client…\n')
  const b = sh('npm', ['run', 'build'], { cwd: RUNTIME_APP })
  if (b.status !== 0) throw new Error('client build failed in ' + RUNTIME_APP)
  await fs.writeFile(VFILE, APP_VERSION)
}

// ---------- browser ----------
function openBrowser(url) {
  const [cmd, ...args] =
    process.platform === 'darwin' ? ['open', url]
    : process.platform === 'win32' ? ['cmd', '/c', 'start', '', url]
    : ['xdg-open', url]
  try { spawn(cmd, args, { stdio: 'ignore', detached: true }).unref() } catch {}
}

// ---------- lifecycle ----------
async function cmdUp({ open = true } = {}) {
  await ensureRuntime()
  const root = projectRoot()
  const data = dataDirFor(root)
  const st = await readState()
  if (st && (await health(st.port))) {
    if (st.dataDir !== data) { await stopServer(st); }       // switching projects → restart
    else { console.log(`already running: http://127.0.0.1:${st.port}  (project ${st.project})`); if (open) openBrowser(`http://127.0.0.1:${st.port}`); return }
  } else if (st) { await clearState() }

  await fs.mkdir(data, { recursive: true })
  const port = await pickPort(DEFAULT_PORT)
  const logfd = await fs.open(LOG, 'a')
  const child = spawn(process.execPath, [path.join(RUNTIME_APP, 'server.mjs')], {
    cwd: RUNTIME_APP,
    env: { ...process.env, PORT: String(port), CANVAS_DATA: data, CANVAS_PROJECT: path.basename(root), CANVAS_IDLE_MIN: process.env.CANVAS_IDLE_MIN || '30' },
    detached: true, stdio: ['ignore', logfd.fd, logfd.fd],
  })
  child.unref()
  for (let i = 0; i < 40; i++) { if (await health(port)) break; await sleep(300) }
  await logfd.close()
  if (!(await health(port))) throw new Error('server did not come up — see ' + LOG)
  await writeState({ pid: child.pid, port, dataDir: data, project: root, version: APP_VERSION, startedAt: new Date().toISOString() })
  console.log(`canvas up: http://127.0.0.1:${port}\nproject: ${root}\nboard:   ${data}`)
  if (open) openBrowser(`http://127.0.0.1:${port}`)
}

async function stopServer(st) {
  if (!st?.pid) return
  try { process.kill(-st.pid, 'SIGTERM') } catch { try { process.kill(st.pid, 'SIGTERM') } catch {} }
  await sleep(300)
}
async function cmdDown() {
  const st = await readState()
  if (!st) { console.log('not running'); return }
  await stopServer(st)
  await clearState()
  console.log('canvas down')
}

async function requireUp() {
  const st = await readState()
  if (st && (await health(st.port))) return st
  throw new Error('canvas is not running — run `canvas up` first')
}

async function cmdStatus() {
  const st = await readState()
  if (!st) { console.log('not running'); return }
  const h = await health(st.port)
  if (!h) { console.log(`stale state (server gone). port ${st.port}. run \`canvas up\`.`); return }
  const n = await countOf(st.dataDir)
  console.log(`running: http://127.0.0.1:${st.port}\nproject: ${st.project}\nboard:   ${st.dataDir}\nshapes:  ${n}\ntabs:    ${h.tabs}`)
}

// ---------- draw ----------
async function post(port, body) {
  const r = await fetch(`http://127.0.0.1:${port}/api/draw`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error('POST failed: ' + r.status)
  return r.json()
}

// ---------- read (from the project's data dir) ----------
const F = (data, name) => path.join(data, name)
async function loadSummary(data) { try { return await fs.readFile(F(data, 'canvas.txt'), 'utf8') } catch { return '' } }
async function countOf(data) { const m = (await loadSummary(data)).match(/canvas: (\d+) shape/); return m ? Number(m[1]) : -1 }
function parseSummary(txt) {
  const lines = txt.split('\n').filter(Boolean)
  const map = {}
  for (const ln of lines.slice(1)) { const id = ln.split(/\s+/)[0]; if (id) map[id] = ln }
  return { header: lines[0] || 'canvas: 0 shape(s)', map }
}
const flag = (name) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : undefined }
const readStdin = () => new Promise((resolve, reject) => {
  let d = ''; process.stdin.setEncoding('utf8')
  process.stdin.on('data', (c) => (d += c)); process.stdin.on('end', () => resolve(d)); process.stdin.on('error', reject)
})

async function main() {
  const cmd = process.argv[2]
  try {
    switch (cmd) {
      case 'up': return await cmdUp({ open: !process.argv.includes('--no-open') })
      case 'down': return await cmdDown()
      case 'status': return await cmdStatus()
      case 'open': { const st = await requireUp(); openBrowser(`http://127.0.0.1:${st.port}`); console.log('opened http://127.0.0.1:' + st.port); return }

      case 'draw': {
        const st = await requireUp()
        const arg = process.argv[3]
        // Read JSON from stdin when the arg is "-" or omitted (heredoc/pipe) — avoids
        // shell-quoting hazards with apostrophes/quotes in shape text.
        let raw = arg && arg !== '-' ? arg : (process.stdin.isTTY ? null : await readStdin())
        if (!raw || !raw.trim()) throw new Error("draw needs JSON as an argument or on stdin (e.g. `draw -` with a heredoc)")
        console.log(JSON.stringify(await post(st.port, JSON.parse(raw)))); return
      }
      case 'clear': { const st = await requireUp(); console.log(JSON.stringify(await post(st.port, { op: 'clear' }))); return }
      case 'delete': { const st = await requireUp(); console.log(JSON.stringify(await post(st.port, { op: 'delete', id: process.argv[3] }))); return }

      case 'view': {
        const st = await requireUp(); const type = flag('--type'), grep = flag('--grep')
        const { header, map } = parseSummary(await loadSummary(st.dataDir))
        if (!type && !grep) { process.stdout.write(await loadSummary(st.dataDir) || header + '\n'); return }
        console.log(header)
        for (const id in map) {
          const ln = map[id]
          if (type && !(ln.split(/\s+/)[1] || '').startsWith(type)) continue
          if (grep && !ln.toLowerCase().includes(grep.toLowerCase())) continue
          console.log(ln)
        }
        return
      }
      case 'diff': {
        const st = await requireUp()
        const { header, map } = parseSummary(await loadSummary(st.dataDir))
        const seen = path.join(st.dataDir, '.seen.json')
        let prev = {}; try { prev = JSON.parse(await fs.readFile(seen, 'utf8')) } catch {}
        const added = [], changed = [], removed = []
        for (const id in map) { if (!(id in prev)) added.push(map[id]); else if (prev[id] !== map[id]) changed.push(map[id]) }
        for (const id in prev) if (!(id in map)) removed.push(id)
        console.log(header)
        if (!added.length && !changed.length && !removed.length) console.log('(no changes since last diff)')
        added.forEach((l) => console.log('+ ' + l)); changed.forEach((l) => console.log('~ ' + l)); removed.forEach((id) => console.log('- ' + id))
        await fs.writeFile(seen, JSON.stringify(map)); return
      }
      case 'stats': {
        const st = await requireUp()
        const { header, map } = parseSummary(await loadSummary(st.dataDir))
        const counts = {}; for (const id in map) { const k = map[id].split(/\s+/)[1] || '?'; counts[k] = (counts[k] || 0) + 1 }
        console.log(header); console.log(Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}: ${n}`).join('\n')); return
      }
      case 'count': { const st = await requireUp(); console.log(await countOf(st.dataDir)); return }
      case 'expect': {
        const st = await requireUp(); const want = Number(process.argv[3]); let got = -1
        for (let i = 0; i < 24; i++) { got = await countOf(st.dataDir); if (got === want) break; await sleep(350) }
        console.log(got === want ? `OK ${got} shapes` : `TIMEOUT want=${want} got=${got}`); return
      }
      case 'errors': { const st = await requireUp(); try { process.stdout.write(await fs.readFile(F(st.dataDir, 'errors.log'), 'utf8')) } catch { console.log('(no errors)') } return }

      case 'png': { const st = await requireUp(); console.log(F(st.dataDir, 'canvas.png')); return }  // path to the latest render
      default:
        console.log('usage: canvas up|down|status|open|draw|clear|delete|view|diff|stats|count|expect|errors|png'); process.exit(cmd ? 1 : 0)
    }
  } catch (e) {
    console.error('error:', e.message); process.exit(1)
  }
}
main()
