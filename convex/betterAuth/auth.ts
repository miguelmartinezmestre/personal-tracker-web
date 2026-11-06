import { convexAdapter } from '@convex-dev/better-auth';
import { betterAuth } from 'better-auth/minimal';
import { authSchemaOptions } from '../features/auth/schemaOptions';

// The CLI only reads the schema, so the adapter never sees a real context or component.
const unusedContext: never = Object.create(null) as never;

// Only read by the Better Auth CLI to generate generatedSchema.ts; never imported at runtime.
export const auth = betterAuth({
    ...authSchemaOptions,
    database: convexAdapter(unusedContext, unusedContext),
});
