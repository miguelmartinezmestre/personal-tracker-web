import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import jsxa11y from "eslint-plugin-jsx-a11y"
import tanstackQuery from "@tanstack/eslint-plugin-query"
import tanstackRouter from "@tanstack/eslint-plugin-router"

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/', '.turbo/', 'test-results/'] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  jsxa11y.flatConfigs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.app.json', './tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname,
        ecmaVersion: 2020,
        sourceType: 'module',
      },
      globals: {
        ...globals.browser,
        ...globals.es2020,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      '@tanstack/query': tanstackQuery,
      '@tanstack/router': tanstackRouter,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...tanstackQuery.configs.recommended.rules,
      ...tanstackRouter.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
)
