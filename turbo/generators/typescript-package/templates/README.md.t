# @repo/{{kebabCase name}}

{{description}}

## Instalación

Este package es parte del monorepo y se puede usar en otros packages o apps del workspace.

```bash
npm install @repo/{{kebabCase name}}
```

## Uso

```typescript
import { hello } from "@repo/{{kebabCase name}}";

const greeting = hello("World");
console.log(greeting); // "Hello, World!"
```

## Scripts

- `npm run lint` - Ejecuta ESLint
- `npm run check-types` - Verifica los tipos de TypeScript

