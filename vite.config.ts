import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // 5173 es el origen permitido por defecto en el CORS del gateway.
  server: { host: 'localhost', port: 5173, strictPort: true },
  test: { environment: 'jsdom', include: ['src/**/*.spec.ts'] },
})
