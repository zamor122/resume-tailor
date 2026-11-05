import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Integration-test config — for tests that hit REAL external services (LLM providers,
 * Stripe test mode, Supabase). Kept separate from vitest.config.ts so the default
 * `npm test` run stays hermetic, fast and deterministic.
 *
 * Run with:  bash scripts/run-live-verify.sh
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 600_000,
    hookTimeout: 600_000,
    pool: 'forks',
    reporters: ['verbose'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
