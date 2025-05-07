import globals from "globals";
import tseslint from "typescript-eslint";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";

// For Jest environment, if you have specific Jest linting rules and want to use the plugin:
// import jestPlugin from 'eslint-plugin-jest';

export default tseslint.config(
  // Global ignores. Ensure this list is comprehensive for your project.
  {
    ignores: [
      ".eslintrc.js",     // The old config file name, if it still exists
      "node_modules/",
      "dist/",
      ".turbo/",
      "coverage/",        // Typically ignored
      "prisma/generated/" // Example for Prisma, add if you use it
      // Add other generated/output directories
    ],
  },

  // Base configurations from typescript-eslint.
  // This includes ESLint's recommended rules and TypeScript-specific recommended rules.
  // `recommendedTypeChecked` is used because your original config specified `parserOptions.project`,
  // indicating you are performing type-aware linting.
  ...tseslint.configs.recommendedTypeChecked,

  // Customizations for your project's TypeScript files
  {
    files: ["src/**/*.ts", "test/**/*.ts"], // Apply to source and test TypeScript files
                                         // Adjust glob patterns if your files are located elsewhere
    languageOptions: {
      parserOptions: {
        project: 'tsconfig.json', // Path to your tsconfig.json relative to eslint.config.js
        tsconfigRootDir: import.meta.dirname, // For ESM; if your package.json isn't "type": "module", use __dirname
        sourceType: "module", // As specified in your original parserOptions
      },
      globals: {
        ...globals.node,    // For Node.js environment (replaces env.node: true)
        ...globals.jest,    // For Jest testing environment (replaces env.jest: true)
      },
    },
    rules: {
      // Your custom TypeScript rules from the old config
      "@typescript-eslint/interface-name-prefix": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "off",

      // Note: eslintPluginPrettierRecommended handles enabling "prettier/prettier" rule
      // and disabling conflicting ESLint core/plugin rules.
    },
  },

  // Jest specific configuration using eslint-plugin-jest (optional)
  // If you want Jest-specific linting rules beyond just the environment globals:
  // 1. Ensure `eslint-plugin-jest` is installed: `pnpm add -D eslint-plugin-jest` in `apps/backend`
  // 2. Uncomment and configure this section:
  // {
  //   files: ["**/*.spec.ts", "**/*.test.ts", "**/test/**/*.ts"], // Adjust to your test file patterns
  //   plugins: {
  //     jest: jestPlugin,
  //   },
  //   rules: {
  //     ...jestPlugin.configs.recommended.rules, // Or flat/recommended for newer versions
  //     // any Jest-specific rule overrides
  //   },
  //   languageOptions: {
  //     globals: { // Already covered by the globals above, but good for plugin-specific context
  //       ...globals.jest,
  //     },
  //   },
  // },

  // Prettier configuration - This should generally be the LAST configuration in the array.
  // `eslint-plugin-prettier/recommended` effectively:
  // 1. Extends `eslint-config-prettier` (disabling ESLint rules that conflict with Prettier).
  // 2. Enables the `prettier/prettier` rule (reporting Prettier violations as ESLint issues).
  eslintPluginPrettierRecommended,
);
