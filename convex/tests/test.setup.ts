// Must include `convex/_generated/*` so convex-test can resolve the API.
// Exclude convex/tests so Vitest helpers are never loaded as Convex modules.
export const modules = import.meta.glob(['../**/*.*s', '!../tests/**']);
