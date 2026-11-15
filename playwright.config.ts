import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  use: {
    baseURL: 'http://localhost:5179',
    ...devices['Desktop Chrome'],
    viewport: { width: 1100, height: 900 },
  },
  webServer: {
    command: 'npx vp dev --port 5179 --strictPort',
    url: 'http://localhost:5179',
    reuseExistingServer: !process.env.CI,
  },
})
