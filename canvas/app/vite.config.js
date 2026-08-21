// Build-only: produces ./dist, which server.mjs serves. No dev plugin/middleware.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: { outDir: 'dist', chunkSizeWarningLimit: 4000 },
})
