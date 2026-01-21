import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

const reactPath = path.resolve(__dirname, "./apps/front/node_modules/react");
const reactDomPath = path.resolve(__dirname, "./apps/front/node_modules/react-dom");

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./apps/front/vitest.setup.ts"],
    server: { deps: { inline: ["convex-test", "@repo/ui", new RegExp("^@radix-ui/")] } },
    reporters: ["tree"],
    include: [
      "packages/backend/convex/tests/**/*.test.ts",
      "apps/front/src/**/*.test.{ts,tsx}",
      "apps/front/src/**/*.spec.{ts,tsx}",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/",
        "convex/_generated/",
        "packages/backend/convex/_generated/",
        "packages/backend/convex/betterAuth/_generated/",
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
        "packages/backend/convex/test_helpers.ts",
        "packages/ui/**",
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
      "@": path.resolve(__dirname, "./apps/front/src"),
      "@repo/backend": path.resolve(__dirname, "./packages/backend"),
      react: reactPath,
      "react-dom": reactDomPath,
      "react/jsx-runtime": path.resolve(reactPath, "jsx-runtime.js"),
      "react/jsx-dev-runtime": path.resolve(reactPath, "jsx-dev-runtime.js"),
    },
    dedupe: ["react", "react-dom"],
  },
});
