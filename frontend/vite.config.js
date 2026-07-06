import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// During development, any request starting with /api is forwarded
// to the FastAPI server on port 8000. In production FastAPI serves
// everything itself, so no proxy is needed.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
