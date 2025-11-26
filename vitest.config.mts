import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    server: { deps: { inline: ["convex-test"] } },
    include: [
      "convex/**/*.test.ts",
      "src/**/*.test.{ts,tsx}",
      "src/**/*.spec.{ts,tsx}",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/",
        "convex/_generated/",
        "**/*.d.ts",
        "**/*.config.{ts,js,mjs}",
        "**/setupTests.ts",
        "**/vitest.setup.ts",
        "**/*.test.{ts,tsx}",
        "**/*.spec.{ts,tsx}",
        "**/playwright.config.ts",
        "**/next.config.ts",
        "**/tailwind.config.*",
        "**/postcss.config.*",
        ".next/",
        "coverage/",
        "dist/",
        "build/",
        "scripts/",
        "tests/",
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});