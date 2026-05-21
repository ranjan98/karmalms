import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Integration tests run against a real Postgres (`*.itest.ts`). They are kept
 * separate from the unit suite (`vitest.config.ts`, `*.test.ts`) so the unit
 * tests need no database. `npm run test:integration` runs this config.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.itest.ts"],
    globalSetup: ["src/test/global-setup.ts"],
    setupFiles: ["src/test/setup.ts"],
    // All files share one Postgres — run them serially to avoid cross-talk.
    fileParallelism: false,
    hookTimeout: 30_000,
  },
});
