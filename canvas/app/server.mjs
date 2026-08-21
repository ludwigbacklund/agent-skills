// Standalone canvas server: tldraw-sync room + agent HTTP API + static client.
// One Node process. No Vite at runtime (client is prebuilt into ./dist).
import http from 'node:http'
import { WebSocketServer } from 'ws'
import { TLSocketRoom } from '@tldraw/sync-core'
import { promises as fs, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { applyCommands, summarize } from './shapes.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const DATA = process.env.CANVAS_DATA ? path.resolve(process.env.CANVAS_DATA) : path.resolve('data')
const PORT = Number(process.env.PORT) || 5179
const IDLE_MS = (Number(process.env.CANVAS_IDLE_MIN) || 30) * 60 * 1000
const DIST = path.join(HERE, 'dist')
// Project folder name -> browser tab title, so multiple project tabs are distinguishable.
// Prefer the value the CLI passes; else derive it from the data dir (<root>/.claude/canvas).
const PROJECT = process.env.CANVAS_PROJECT || path.basename(path.resolve(DATA, '..', '..')) || 'canvas'
const TITLE = `${PROJECT} — canvas`
const BLANK = path.join(HERE, 'blank-seed.json')
const F = { doc: path.join(DATA, 'canvas.json'), txt: path.join(DATA, 'canvas.txt'), png: path.join(DATA, 'canvas.png'), err: path.join(DATA, 'errors.log') }

await fs.mkdir(DATA, { recursive: true })
fs.writeFile(path.join(DATA, '.gitignore'), '*\n').catch(() => {})

// Restore persisted room, else start from the blank seed (document + page).
let initialSnapshot
try { initialSnapshot = JSON.parse(readFileSync(F.doc, 'utf8')) }
catch { initialSnapshot = JSON.parse(readFileSync(BLANK, 'utf8')) }

let persistTimer = null
// NOTE: updateStore/getCurrentSnapshot are marked deprecated in 5.1.0 in favour of a
// pluggable storage backend (aimed at SQLite/Cloudflare). For a local single-process
// tool they remain the simplest working API and match tldraw's own server examples.
const room = new TLSocketRoom({
  initialSnapshot,
  onDataChange: () => { clearTimeout(persistTimer); persistTimer = setTimeout(persist, 400) },
})

async function persist() {
  try {
    const snap = room.getCurrentSnapshot()
    await fs.writeFile(F.doc, JSON.stringify(snap))
    await fs.writeFile(F.txt, summarize(snap))
  } catch (e) { console.error('[canvas] persist error', e) }
}
persist() // ensure canvas.txt exists immediately so reads work

let last = Date.now()
const touch = () => { last = Date.now() }
setInterval(() => {
  if (room.getNumActiveSessions() === 0 && Date.now() - last > IDLE_MS) { console.log('[canvas] idle shutdown'); process.exit(0) }
}, 60000).unref()

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.map': 'application/json' }
const readBody = (req, raw = false) => new Promise((resolve, reject) => {
  const chunks = []
  req.on('data', (c) => chunks.push(c)); req.on('error', reject)
  req.on('end', () => { const b = Buffer.concat(chunks); if (raw) return resolve(b); try { resolve(b.length ? JSON.parse(b.toString()) : {}) } catch (e) { reject(e) } })
})
const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)) }
const escapeHtml = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))

// Serve index.html with the <title> rewritten to the project name. Cached after first read
// (TITLE is fixed for the process — one project per server).
let indexHtml = null
async function serveIndex(res) {
  try {
    if (indexHtml == null) {
      const raw = await fs.readFile(path.join(DIST, 'index.html'), 'utf8')
      indexHtml = raw.replace(/<title>.*?<\/title>/, `<title>${escapeHtml(TITLE)}</title>`)
    }
    res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(indexHtml)
  } catch { res.writeHead(404); res.end('build the client: npm run build') }
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x'); const p = u.pathname
  touch()
  try {
    if (p === '/api/health') return json(res, 200, { ok: true, data: DATA, port: PORT, tabs: room.getNumActiveSessions() })
    if (p === '/api/draw' && req.method === 'POST') {
      const body = await readBody(req)
      const cmds = Array.isArray(body) ? body : [body]
      let errors = [], warnings = []
      await room.updateStore((store) => { ({ errors, warnings } = applyCommands(store, cmds)) })
      if (errors.length) await fs.appendFile(F.err, errors.map((e) => '[draw] ' + e + '\n').join(''))
      if (warnings.length) await fs.appendFile(F.err, warnings.map((w) => '[warn] ' + w + '\n').join(''))
      return json(res, 200, { ok: true, applied: cmds.length, errors, warnings })
    }
    if (p === '/api/snapshot' && req.method === 'PUT') { await fs.writeFile(F.png, await readBody(req, true)); return json(res, 200, { ok: true }) }
    if (p === '/api/log' && req.method === 'POST') { const b = await readBody(req); await fs.appendFile(F.err, '[client] ' + (b.message || '') + '\n'); return json(res, 200, { ok: true }) }
    if (p.startsWith('/api/')) return json(res, 404, { error: 'unknown endpoint' })

    // static client (SPA) — index.html is title-injected; other paths served as-is
    if (p === '/') return serveIndex(res)
    const fp = path.join(DIST, p)
    if (!fp.startsWith(DIST)) { res.writeHead(403); return res.end() }
    try {
      const data = await fs.readFile(fp)
      res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' }); res.end(data)
    } catch {
      return serveIndex(res)   // SPA fallback
    }
  } catch (e) { json(res, 500, { error: String(e?.message || e) }) }
})

const wss = new WebSocketServer({ server })
let sid = 0
wss.on('connection', (socket) => { touch(); room.handleSocketConnect({ sessionId: 'sess-' + (++sid), socket }) })

server.listen(PORT, '127.0.0.1', () => console.log(`[canvas] listening on ${PORT}  data=${DATA}`))
