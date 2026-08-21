import { Tldraw } from 'tldraw'
import { useSync } from '@tldraw/sync'
import 'tldraw/tldraw.css'

// Real-time multiplayer via tldraw sync: the server room is the single source of
// truth, so any number of tabs just work — no executor lock, no divergence.
const WS = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/connect/board`

// Keep a PNG render fresh on the server so the agent can *see* the board. Any
// connected tab can do this; redundant writes across tabs are harmless.
function setupExport(editor) {
  window.editor = editor // handy from devtools
  const exportPng = async () => {
    const ids = [...editor.getCurrentPageShapeIds()]
    if (!ids.length) return
    try {
      const b = editor.getCurrentPageBounds()
      const maxDim = b ? Math.max(b.w, b.h) : 1000
      const scale = Math.min(1, 1500 / maxDim)
      const { blob } = await editor.toImage(ids, { format: 'png', background: true, padding: 40, scale, pixelRatio: 1 })
      await fetch('/api/snapshot', { method: 'PUT', headers: { 'Content-Type': 'image/png' }, body: blob })
    } catch (e) {
      fetch('/api/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'export: ' + (e?.message || e) }) }).catch(() => {})
    }
  }
  let t
  const sched = () => { clearTimeout(t); t = setTimeout(exportPng, 1200) }
  editor.store.listen(sched, { scope: 'document', source: 'all' })
  sched()
}

export default function App() {
  const store = useSync({ uri: WS })
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Tldraw store={store} onMount={setupExport} />
    </div>
  )
}
