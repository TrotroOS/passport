import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**"],
      exclude: [
        "src/lib/supabase/**",
        "src/lib/actions/**",
        "src/lib/pipeline/**",
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        statements: 70,
      },
    },
    setupFiles: ["tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
