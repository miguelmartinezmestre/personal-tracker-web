{
  "name": "@repo/{{kebabCase name}}",
  "version": "0.0.0",
  "private": true,
  "description": "{{description}}",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "lint": "eslint . --max-warnings 0",
    "check-types": "tsc --noEmit",
    "test": "jest"
  },
  "devDependencies": {
    "@repo/eslint-config": "workspace:*",
    "@repo/typescript-config": "workspace:*",
    "@types/jest": "^29.5.14",
    "@types/node": "^24.10.2",
    "eslint": "^9.39.1",
    "jest": "^29.7.0",
    "ts-jest": "^29.2.5",
    "typescript": "5.9.3"
  }
}

