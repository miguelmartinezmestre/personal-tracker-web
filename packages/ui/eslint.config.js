import { config } from "@repo/eslint-config/react-internal"

/** @type {import("eslint").Linter.Config} */
export default [
  ...config,
  {
    rules: {
      "max-lines": "off",
    },
  },
]
