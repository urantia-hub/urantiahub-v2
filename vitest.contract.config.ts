import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: { environment: "node", include: ["contract/**/*.test.ts"], testTimeout: 60_000 },
});
