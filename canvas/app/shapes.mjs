// Server-side shape-record construction + summary, for the tldraw-sync version.
// Records are hand-built (no Editor) but use the EXACT defaults from tldraw 5.1.0's
// getDefaultProps(), so they validate. Pinned via package-lock; re-check on upgrade.
import { createShapeId, createBindingId, toRichText } from '@tldraw/tlschema'
import { getIndexAbove, ZERO_INDEX_KEY } from '@tldraw/utils'

const DEFAULTS = {
  geo: { w: 100, h: 100, geo: 'rectangle', dash: 'draw', growY: 0, url: '', scale: 1, color: 'black', labelColor: 'black', fill: 'none', size: 'm', font: 'draw', align: 'middle', verticalAlign: 'middle' },
  text: { color: 'black', size: 'm', w: 8, font: 'draw', textAlign: 'start', autoSize: true, scale: 1 },
  note: { color: 'black', size: 'm', font: 'draw', align: 'middle', verticalAlign: 'middle', labelColor: 'black', growY: 0, fontSizeAdjustment: 1, url: '', scale: 1, textFirstEditedBy: null },
  arrow: { kind: 'arc', elbowMidPoint: 0.5, dash: 'draw', size: 'm', fill: 'none', color: 'black', labelColor: 'black', bend: 0, arrowheadStart: 'none', arrowheadEnd: 'arrow', labelPosition: 0.5, font: 'draw', scale: 1 },
  frame: { w: 320, h: 180, name: '', color: 'black' },
}
const has = (v) => v !== undefined && v !== null
const opt = (k, v) => (has(v) ? { [k]: v } : {})

// --- auto-fit: grow a geo box's height so its label never overflows ---------
// The records are hand-built, so tldraw's own text-fit (growY) never runs. When a
// caller omits `h`, we estimate the wrapped line count from the label and size the
// box to hold it. Deliberately generous (a little slack beats clipped text), and
// conservative on glyph width since the `draw` font (Shantell Sans) is wide. An
// explicit `h` always wins — existing layouts are untouched.
const LABEL_FONT_PX = { s: 18, m: 24, l: 36, xl: 44 } // tldraw LABEL_FONT_SIZES
const LINE_HEIGHT = 1.4
const V_PAD = 22 // breathing room above+below the text block
const H_PAD = 18 // horizontal label padding per side (~tldraw LABEL_PADDING)
const CHAR_W_FRAC = 0.62 // avg glyph width as a fraction of font px (wide font → overestimate lines)

function fitGeoHeight(text, size, w) {
  const fs = LABEL_FONT_PX[size] || LABEL_FONT_PX.m
  const usable = Math.max(1, (w ?? 200) - 2 * H_PAD)
  const perLine = Math.max(1, Math.floor(usable / (CHAR_W_FRAC * fs)))
  let lines = 0
  for (const ln of String(text ?? '').split('\n')) lines += Math.max(1, Math.ceil(ln.length / perLine))
  return Math.ceil(lines * fs * LINE_HEIGHT + 2 * V_PAD)
}

// Plain text out of a richText prosemirror doc (used when refitting on update).
function richPlain(doc) {
  if (!doc || !doc.content) return ''
  const out = []
  const walk = (n) => { if (n.text) out.push(n.text); (n.content || []).forEach(walk) }
  doc.content.forEach(walk)
  return out.join('\n')
}

// Caller-supplied stable id -> deterministic tldraw RecordId. `createShapeId('atlas')`
// always yields `shape:atlas`, so the agent can name a shape on create and target it
// later (update/delete) with no read-back round trip. Already-prefixed ids pass through.
const resolveId = (id) => (has(id) ? (String(id).startsWith('shape:') ? id : createShapeId(String(id))) : null)

function rec(type, pageId, index, x = 0, y = 0, props, id) {
  return { id: id || createShapeId(), typeName: 'shape', type, x, y, rotation: 0, index, parentId: pageId, isLocked: false, opacity: 1, props, meta: {} }
}

// An arrow-to-shape binding record (tldraw 5.1.0 exact shape; props verified against the
// schema validator). normalizedAnchor center + isPrecise:false → arrow auto-routes to the
// target's edge and follows it when the shape moves.
function bindingRec(arrowId, targetId, terminal) {
  return {
    id: createBindingId(), typeName: 'binding', type: 'arrow', fromId: arrowId, toId: targetId,
    props: { terminal, normalizedAnchor: { x: 0.5, y: 0.5 }, isExact: false, isPrecise: false, snap: 'none' }, meta: {},
  }
}
// Page-space center of a shape (for a bound arrow's initial endpoint; the client recomputes).
function centerOf(s) {
  const p = s.props || {}
  return p.w != null && p.h != null ? { x: s.x + p.w / 2, y: s.y + p.h / 2 } : { x: s.x, y: s.y }
}

function buildRecords(c, pageId, nextIndex, store) {
  const id = resolveId(c.id)            // optional caller-supplied stable id (undefined -> auto)
  switch (c.op) {
    case 'rect': case 'ellipse': case 'geo': {
      const geo = c.op === 'rect' ? 'rectangle' : c.op === 'ellipse' ? 'ellipse' : c.geo || 'rectangle'
      const w = c.w ?? 200
      // Omit `h` → fit the label; pass `h` → exact (manual layouts unchanged).
      const h = has(c.h) ? c.h : fitGeoHeight(c.text, c.size ?? DEFAULTS.geo.size, w)
      return [rec('geo', pageId, nextIndex(), c.x ?? 0, c.y ?? 0, {
        ...DEFAULTS.geo, geo, w, h, color: c.color ?? 'black', fill: c.fill ?? 'none',
        ...opt('dash', c.dash), ...opt('size', c.size), ...opt('align', c.align), richText: toRichText(String(c.text ?? '')),
      }, id)]
    }
    case 'text':
      return [rec('text', pageId, nextIndex(), c.x ?? 0, c.y ?? 0, {
        ...DEFAULTS.text, color: c.color ?? 'black', ...opt('size', c.size),
        ...(c.w ? { w: c.w, autoSize: false } : {}), richText: toRichText(String(c.text ?? '')),
      }, id)]
    case 'note':
      return [rec('note', pageId, nextIndex(), c.x ?? 0, c.y ?? 0, {
        ...DEFAULTS.note, color: c.color ?? 'yellow', ...opt('size', c.size), ...opt('align', c.align), richText: toRichText(String(c.text ?? '')),
      }, id)]
    case 'arrow': {
      const arrowId = id || createShapeId()
      // Optional bound endpoints: from/to reference an existing shape by id/alias. The
      // referenced shape must already be in the store (created earlier in the batch).
      const bindTo = (ref, terminal) => {
        const tid = resolveId(ref)
        const t = store.get(tid)
        if (!t || t.typeName !== 'shape') throw new Error(`no shape "${ref}" to bind`)
        return { tid, center: centerOf(t), terminal }
      }
      const from = has(c.from) ? bindTo(c.from, 'start') : null
      const to = has(c.to) ? bindTo(c.to, 'end') : null
      const start = from ? from.center : { x: c.x1 ?? 0, y: c.y1 ?? 0 }
      const end = to ? to.center : { x: c.x2 ?? 100, y: c.y2 ?? 100 }
      const out = [rec('arrow', pageId, nextIndex(), 0, 0, {
        ...DEFAULTS.arrow, color: c.color ?? 'black', start, end,
        ...opt('dash', c.dash), ...opt('size', c.size), ...opt('bend', c.bend), ...opt('kind', c.kind),
        ...opt('arrowheadStart', c.arrowheadStart), ...opt('arrowheadEnd', c.arrowheadEnd),
        richText: toRichText(String(c.text ?? '')),
      }, arrowId)]
      if (from) out.push(bindingRec(arrowId, from.tid, 'start'))
      if (to) out.push(bindingRec(arrowId, to.tid, 'end'))
      return out
    }
    case 'stack': { // lay out a list of boxes in a column/row with a gap — no overlap, no pitch guessing.
      const dir = c.dir === 'right' ? 'right' : 'down'  // default: stack downward
      const gap = c.gap ?? 12
      const baseW = c.w ?? 200
      let cx = c.x ?? 0, cy = c.y ?? 0
      const out = []
      for (const it of (c.items || [])) {
        const itemOp = it.op || 'rect'
        const geo = itemOp === 'ellipse' ? 'ellipse' : itemOp === 'geo' ? (it.geo || 'rectangle') : 'rectangle'
        const w = it.w ?? baseW
        const size = it.size ?? c.size ?? DEFAULTS.geo.size
        const h = has(it.h) ? it.h : fitGeoHeight(it.text, size, w)   // each box sized to its own label
        out.push(rec('geo', pageId, nextIndex(), cx, cy, {
          ...DEFAULTS.geo, geo, w, h, color: it.color ?? c.color ?? 'black', fill: it.fill ?? c.fill ?? 'none',
          ...opt('dash', it.dash ?? c.dash), size, ...opt('align', it.align ?? c.align), richText: toRichText(String(it.text ?? '')),
        }, resolveId(it.id)))
        if (dir === 'down') cy += h + gap; else cx += w + gap   // advance past THIS box's real extent
      }
      return out
    }
    case 'frame':
      return [rec('frame', pageId, nextIndex(), c.x ?? 0, c.y ?? 0, { ...DEFAULTS.frame, w: c.w ?? 400, h: c.h ?? 300, ...opt('name', c.name) }, id)]
    case 'shape': { // raw passthrough — fill base + any known defaults, caller supplies props
      const s = c.shape || {}
      return [rec(s.type, pageId, nextIndex(), s.x ?? 0, s.y ?? 0, { ...(DEFAULTS[s.type] || {}), ...(s.props || {}) }, id || resolveId(s.id))]
    }
    default:
      throw new Error('unknown op: ' + c.op)
  }
}

// Mutate an existing shape record in place from an `update` command. Position is
// absolute (x/y) or relative (dx/dy); props edits mirror the create vocabulary.
// Unknown/invalid props are rejected by the schema on store.put (caught per-command).
function applyUpdate(shape, c) {
  const next = structuredClone(shape)
  if (has(c.x)) next.x = c.x
  if (has(c.y)) next.y = c.y
  if (has(c.dx)) next.x = (next.x || 0) + c.dx
  if (has(c.dy)) next.y = (next.y || 0) + c.dy
  const p = next.props
  if (has(c.w)) p.w = c.w
  if (has(c.h)) p.h = c.h
  if (has(c.color)) p.color = c.color
  if (has(c.fill)) p.fill = c.fill
  if (has(c.dash)) p.dash = c.dash
  if (has(c.size)) p.size = c.size
  if (has(c.align)) p.align = c.align
  if (has(c.text)) { if (next.type === 'frame') p.name = String(c.text); else p.richText = toRichText(String(c.text)) }
  if (has(c.name) && next.type === 'frame') p.name = String(c.name)
  // Refit height when the label or width changed and the caller didn't pin `h`.
  if (next.type === 'geo' && (has(c.text) || has(c.w)) && !has(c.h)) {
    p.h = fitGeoHeight(richPlain(p.richText), p.size, p.w)
  }
  if (next.type === 'arrow') {
    if (has(c.x1) || has(c.y1)) p.start = { x: c.x1 ?? p.start?.x ?? 0, y: c.y1 ?? p.start?.y ?? 0 }
    if (has(c.x2) || has(c.y2)) p.end = { x: c.x2 ?? p.end?.x ?? 0, y: c.y2 ?? p.end?.y ?? 0 }
    if (has(c.bend)) p.bend = c.bend
    if (has(c.kind)) p.kind = c.kind
  }
  return next
}

// ---- layout sanity check: surface overlaps + arrow-over-content so the agent can fix --
// Only flags issues involving shapes touched THIS batch (newly drawn/updated), so existing
// intentional overlaps don't spam. Geometry-only heuristic — generous pads avoid false alarms.
const OVL_PAD = 5 // px of intersection to ignore (touching edges / rounding)
function absBox(s, byId) { // page-space bbox; null if the shape has no w/h (text/note auto-size, arrows)
  if (s.props?.w == null || s.props?.h == null) return null
  let x = s.x, y = s.y, pid = s.parentId
  while (pid && String(pid).startsWith('shape:') && byId[pid]) { x += byId[pid].x; y += byId[pid].y; pid = byId[pid].parentId }
  return { x, y, w: s.props.w, h: s.props.h }
}
function segSeg(ax, ay, bx, by, cx, cy, dx, dy) { // do segments AB and CD cross?
  const d = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx)
  if (d === 0) return false
  const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / d
  const u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / d
  return t >= 0 && t <= 1 && u >= 0 && u <= 1
}
function segHitsRect(s, r) { // does segment s={x1,y1,x2,y2} pass through rect r (shrunk by pad)?
  const x0 = r.x + OVL_PAD, y0 = r.y + OVL_PAD, x1 = r.x + r.w - OVL_PAD, y1 = r.y + r.h - OVL_PAD
  if (x1 <= x0 || y1 <= y0) return false
  const inside = (px, py) => px > x0 && px < x1 && py > y0 && py < y1
  if (inside(s.x1, s.y1) || inside(s.x2, s.y2)) return true
  return [[x0, y0, x1, y0], [x1, y0, x1, y1], [x1, y1, x0, y1], [x0, y1, x0, y0]]
    .some(([ax, ay, bx, by]) => segSeg(s.x1, s.y1, s.x2, s.y2, ax, ay, bx, by))
}
// Candidate polyline path(s) an arrow actually follows, so bent/elbow arrows are checked too —
// not waved through. Straight & bend → one path; elbow → its two possible L-routes (we only warn
// when BOTH hit, since tldraw picks one and we don't replicate its exact corner choice).
function arrowRoutes(a) {
  const p = a.props || {}
  const S = { x: a.x + (p.start?.x || 0), y: a.y + (p.start?.y || 0) }
  const E = { x: a.x + (p.end?.x || 0), y: a.y + (p.end?.y || 0) }
  if (p.kind === 'elbow') return [[S, { x: E.x, y: S.y }, E], [S, { x: S.x, y: E.y }, E]]
  const bend = p.bend || 0
  if (!bend) return [[S, E]]
  // arc ≈ quadratic Bézier through S,E whose midpoint bulges ~bend off the chord (tldraw's sagitta,
  // same side: control = chord-mid + 2·bend·left-perpendicular). Sampled into a 12-segment polyline.
  const mx = (S.x + E.x) / 2, my = (S.y + E.y) / 2, dx = E.x - S.x, dy = E.y - S.y, len = Math.hypot(dx, dy) || 1
  const cx = mx - (dy / len) * 2 * bend, cy = my + (dx / len) * 2 * bend
  const pts = []
  for (let i = 0; i <= 12; i++) { const t = i / 12, u = 1 - t; pts.push({ x: u * u * S.x + 2 * u * t * cx + t * t * E.x, y: u * u * S.y + 2 * u * t * cy + t * t * E.y }) }
  return [pts]
}
const polyHitsRect = (pts, r) => pts.some((q, i) => i > 0 && segHitsRect({ x1: pts[i - 1].x, y1: pts[i - 1].y, x2: q.x, y2: q.y }, r))
function detectIssues(store, touched) {
  const all = store.getAll()
  const byId = Object.fromEntries(all.map((r) => [r.id, r]))
  const boxes = all.filter((r) => r.typeName === 'shape' && r.type === 'geo').map((s) => ({ s, b: absBox(s, byId) })).filter((o) => o.b)
  const warnings = []
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { // box-on-box overlap
    const A = boxes[i], B = boxes[j]
    if (!touched.has(A.s.id) && !touched.has(B.s.id)) continue
    const ox = Math.min(A.b.x + A.b.w, B.b.x + B.b.w) - Math.max(A.b.x, B.b.x)
    const oy = Math.min(A.b.y + A.b.h, B.b.y + B.b.h) - Math.max(A.b.y, B.b.y)
    if (ox > OVL_PAD && oy > OVL_PAD) warnings.push(`overlap: ${shortId(A.s.id)} ↔ ${shortId(B.s.id)}`)
  }
  const frames = all.filter((r) => r.typeName === 'shape' && r.type === 'frame').map((s) => ({ s, b: absBox(s, byId) })).filter((o) => o.b)
  for (let i = 0; i < frames.length; i++) for (let j = i + 1; j < frames.length; j++) { // frame-on-frame overlap (a box inside a frame is fine; two frames colliding is not)
    const A = frames[i], B = frames[j]
    if (!touched.has(A.s.id) && !touched.has(B.s.id)) continue
    const ox = Math.min(A.b.x + A.b.w, B.b.x + B.b.w) - Math.max(A.b.x, B.b.x)
    const oy = Math.min(A.b.y + A.b.h, B.b.y + B.b.h) - Math.max(A.b.y, B.b.y)
    if (ox > OVL_PAD && oy > OVL_PAD) warnings.push(`frames overlap: ${shortId(A.s.id)} ↔ ${shortId(B.s.id)} — grow one less, or move it (frames must not collide)`)
  }
  const tgt = {} // arrow id -> set of bound target ids (its own endpoints — never a "crossing")
  for (const r of all) if (r.typeName === 'binding' && r.type === 'arrow') (tgt[r.fromId] ??= new Set()).add(r.toId)
  for (const a of all) { // arrow (straight, bent, or elbow) crossing a shape it isn't bound to
    if (a.typeName !== 'shape' || a.type !== 'arrow' || !touched.has(a.id)) continue
    const skip = tgt[a.id] || new Set()
    const routes = arrowRoutes(a)
    for (const o of boxes) { // a hit means EVERY candidate route hits it (so an elbow that can dodge isn't flagged)
      if (skip.has(o.s.id)) continue
      if (routes.every((pts) => polyHitsRect(pts, o.b))) { warnings.push(`arrow ${shortId(a.id)} crosses ${shortId(o.s.id)} — bend it more, set kind:"elbow", or reroute`); break }
    }
  }
  // A labeled arrow whose label is bigger than the visible shaft: the centered, horizontal label
  // covers the arrow (and arrowhead), so the connection reads as floating text. Only checkable when
  // both ends are bound — the two boxes give us the real edge-to-edge gap the label sits in.
  const boxBox = Object.fromEntries(boxes.map((o) => [o.s.id, o.b]))
  const ends = {} // arrow id -> { start, end } bound box ids
  for (const r of all) if (r.typeName === 'binding' && r.type === 'arrow') (ends[r.fromId] ??= {})[r.props.terminal] = r.toId
  for (const a of all) {
    if (a.typeName !== 'shape' || a.type !== 'arrow' || !touched.has(a.id)) continue
    const label = richPlain(a.props?.richText).trim()
    const e = ends[a.id]
    if (!label || !e?.start || !e?.end) continue // need a label and both endpoints bound to size the gap
    const A = boxBox[e.start], B = boxBox[e.end]
    if (!A || !B) continue
    const vx = (B.x + B.w / 2) - (A.x + A.w / 2), vy = (B.y + B.h / 2) - (A.y + A.h / 2), dist = Math.hypot(vx, vy) || 1
    const dx = Math.abs(vx) / dist, dy = Math.abs(vy) / dist
    const exit = (b) => Math.min(dx < 1e-6 ? Infinity : (b.w / 2) / dx, dy < 1e-6 ? Infinity : (b.h / 2) / dy) // center→edge along the arrow
    const span = dist - exit(A) - exit(B) // visible edge-to-edge length the label sits on
    const fs = LABEL_FONT_PX[a.props?.size] || LABEL_FONT_PX.m
    const need = dx * (label.length * CHAR_W_FRAC * fs + 2 * H_PAD) + dy * (fs * LINE_HEIGHT + 16) // label box projected onto the arrow (1 line — arrow labels don't wrap)
    if (need > span) warnings.push(`arrow ${shortId(a.id)} label "${label.length > 20 ? label.slice(0, 19) + '…' : label}" hides the shaft — widen the gap between ${shortId(e.start)} and ${shortId(e.end)}, shorten the label, or move it to a nearby text shape`)
  }
  return [...new Set(warnings)].slice(0, 12)
}

// Apply a batch of commands inside a room.updateStore transaction. Each command is
// isolated in try/catch so an invalid one can't abort the batch. Returns {errors, warnings}.
export function applyCommands(store, commands) {
  const all = store.getAll()
  const page = all.find((r) => r.typeName === 'page')
  if (!page) throw new Error('no page in store')
  const pageId = page.id
  const shapeIdx = all.filter((r) => r.typeName === 'shape').map((r) => r.index).sort()
  let idx = shapeIdx.length ? shapeIdx[shapeIdx.length - 1] : ZERO_INDEX_KEY
  const nextIndex = () => (idx = getIndexAbove(idx))
  const errors = []
  const touched = new Set() // shapes created/updated this batch — scope for the layout check
  for (const c of commands) {
    try {
      if (c.op === 'clear') { for (const r of store.getAll()) if (r.typeName === 'shape' || r.typeName === 'binding') store.delete(r.id); continue }
      if (c.op === 'delete') {
        for (const id of [].concat(c.ids || c.id || [])) {
          const rid = resolveId(id); if (!rid) continue
          for (const r of store.getAll()) if (r.typeName === 'binding' && (r.fromId === rid || r.toId === rid)) store.delete(r.id)
          if (store.get(rid)) store.delete(rid)
        }
        continue
      }
      if (c.op === 'update') {
        const id = resolveId(c.id)
        if (!id) throw new Error('missing id')
        const existing = store.get(id)
        if (!existing || existing.typeName !== 'shape') throw new Error('no shape ' + c.id)
        store.put(applyUpdate(existing, c)); touched.add(id); continue
      }
      if (c.op === 'fit') continue // viewport-only, no server effect
      for (const r of buildRecords(c, pageId, nextIndex, store)) { store.put(r); if (r.typeName === 'shape') touched.add(r.id) }
    } catch (e) { errors.push(`${c.op || '?'}: ${e?.message || e}`) }
  }
  return { errors, warnings: detectIssues(store, touched) }
}

// ---- summary (token-efficient view) derived from a RoomSnapshot ----
const trunc = (s, n = 60) => (s.length > n ? s.slice(0, n - 1) + '…' : s)
const R = Math.round
function plain(doc) {
  if (!doc || !doc.content) return ''
  const out = []
  const walk = (n) => { if (n.text) out.push(n.text); (n.content || []).forEach(walk) }
  doc.content.forEach(walk)
  return out.join(' ').replace(/\s+/g, ' ').trim()
}

const shortId = (id) => '#' + String(id).replace('shape:', '')

export function summarize(snapshot) {
  const recs = snapshot.documents.map((d) => d.state)
  const byId = Object.fromEntries(recs.map((r) => [r.id, r]))
  const shapes = recs.filter((r) => r.typeName === 'shape')
  const page = recs.find((r) => r.typeName === 'page')
  // arrow id -> { start?: targetId, end?: targetId } from binding records
  const bound = {}
  for (const r of recs) if (r.typeName === 'binding' && r.type === 'arrow') (bound[r.fromId] ??= {})[r.props.terminal] = r.toId
  const lines = [`canvas: ${shapes.length} shape(s) on page "${page?.name ?? ''}"`]
  const abs = (s) => { // walk parent frames for absolute page coords (rotation ignored)
    let x = s.x, y = s.y, pid = s.parentId
    while (pid && pid.startsWith('shape:') && byId[pid]) { x += byId[pid].x; y += byId[pid].y; pid = byId[pid].parentId }
    return { x, y }
  }
  for (const s of shapes) {
    const pr = s.props || {}
    const kind = s.type === 'geo' ? `geo/${pr.geo}` : s.type
    const o = abs(s)
    let pos
    if (s.type === 'arrow') { // bound endpoints shown as #target, free endpoints as coords
      const b = bound[s.id] || {}
      const start = b.start ? shortId(b.start) : `(${R(o.x + (pr.start?.x || 0))},${R(o.y + (pr.start?.y || 0))})`
      const end = b.end ? shortId(b.end) : `(${R(o.x + (pr.end?.x || 0))},${R(o.y + (pr.end?.y || 0))})`
      pos = `${start}->${end}`
    } else { const dim = pr.w != null && pr.h != null ? ` ${R(pr.w)}x${R(pr.h)}` : ''; pos = `@(${R(o.x)},${R(o.y)})${dim}` }
    const txt = trunc(plain(pr.richText))
    lines.push(`${s.id}  ${kind} ${pos}${pr.color ? ' ' + pr.color : ''}${txt ? ` "${txt}"` : ''}`)
  }
  return lines.join('\n') + '\n'
}
