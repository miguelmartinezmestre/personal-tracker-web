# Vendored padding-line-between-statements

Source: [ESLint Stylistic](https://github.com/eslint-stylistic/eslint-stylistic), commit
`435c3ea0fd26a5fef9042c4b36b6e165fbbf8d08`.

Copied files:

- `packages/eslint-plugin/rules/padding-line-between-statements/padding-line-between-statements.ts`
- `packages/eslint-plugin/rules/padding-line-between-statements/types.d.ts` →
  `padding-line-options.d.ts`
- Root `LICENSE`, retained verbatim. Both OpenJS Foundation and ESLint Stylistic notices apply.

The rule is MIT-licensed. Keep `LICENSE` with every copy. No Stylistic, ESLint or parser runtime
dependency is required; only `@oxlint/plugins`, pinned to the installed `oxlint` version.

## Local adaptations

- Upstream type aliases are replaced with Oxlint's ESTree, context, token/comment and rule types.
- `AST_NODE_TYPES` enum members are replaced with identical string literals.
- Indexed reads are guarded; impossible missing entries raise explicit invariant errors.
- The upstream `createRule` factory is replaced with `createPaddingLineRule(options, statementTypes?)`.
  The optional second argument registers caller-defined statement types, consulted before the
  upstream table.
- `padding-line-ast.ts` implements the small AST helper surface with Oxlint's source-code/token API.

The spacing policy itself lives in `../../rules/require-readable-spacing.ts`. It only adds blank
lines, never collapses existing ones, and keeps imports, short single-line bindings and overload
signatures grouped.

These files are excluded from Prettier and Oxlint so future upstream diffs stay reviewable.
