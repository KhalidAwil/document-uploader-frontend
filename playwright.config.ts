import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Security Testing
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e/security-tests',
  fullyParallel: false, // Run tests sequentially for security testing
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1, // Single worker for consistent results
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/security-test-results.json' }],
    ['list']
  ],

  use: {
    baseURL: 'http://localhost:4200',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
  },

  // Configure test timeout
  timeout: 30000,
  expect: {
    timeout: 5000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Run dev server before tests
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
