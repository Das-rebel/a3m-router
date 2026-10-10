import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Canonical test runner for the repo. TypeScript tests import
    // extensionless src paths (vite resolution), so vitest is the runner.
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'proxy/**', // standalone a3m-proxy package: own package.json + deps (express)
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
    ],
  },
})
