import { defineConfig, devices } from '@playwright/test'

/**
 * Pruebas de sistema (ISO/IEC/IEEE 29119) contra el backend real.
 * Requiere los servicios encendidos (local-runtime/iniciar.ps1) y `npm run dev`.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    locale: 'es-EC',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
})
