import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // Phase 1.2: Enhanced testing configuration for database compatibility
    passWithNoTests: true,
    // Skip tests that fail due to native module issues in CI
    testTimeout: 30000,
    // Use in-memory databases for testing to avoid native module conflicts
    env: {
      NODE_ENV: 'test',
      VITEST_DATABASE_URL: ':memory:',
    },
  },
  resolve: {
    alias: {
      '@main': resolve(__dirname, './src/main'),
      '@renderer': resolve(__dirname, './src/renderer'),
      '@shared': resolve(__dirname, './src/shared'),
    },
  },
});
