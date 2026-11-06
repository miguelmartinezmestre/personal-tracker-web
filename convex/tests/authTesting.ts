import { mutationGeneric, type FunctionReference, type GenericMutationCtx } from 'convex/server';
import { v } from 'convex/values';
import type { TestConvex } from 'convex-test';
import type { GenericSchema, SchemaDefinition } from 'convex/server';
import type { DataModel } from '../betterAuth/_generated/dataModel';
import { components } from '../_generated/api';

// Test-only module mounted inside the betterAuth component (see test.helper.ts), so tests can
// arrange and inspect the Better Auth tables the same way `t.run` does for the app's tables.

export type AuthMutationCtx = GenericMutationCtx<DataModel>;

const callbacks = new Map<string, (ctx: AuthMutationCtx) => Promise<unknown>>();
let nextKey = 0;

export const run = mutationGeneric({
    args: { key: v.string() },
    handler: async (ctx, { key }) => {
        const callback = callbacks.get(key);
        callbacks.delete(key);

        if (!callback) {
            throw new Error(`Unknown auth test callback ${key}`);
        }

        return await callback(ctx as unknown as AuthMutationCtx);
    },
});

// Not part of the generated component API: this module only exists in tests.
const runReference = (
    components.betterAuth as unknown as {
        testing: { run: FunctionReference<'mutation', 'internal', { key: string }> };
    }
).testing.run;

export async function runInAuth<Output>(
    t: TestConvex<SchemaDefinition<GenericSchema, boolean>>,
    callback: (ctx: AuthMutationCtx) => Promise<Output>
): Promise<Output> {
    const key = String(nextKey++);
    callbacks.set(key, callback);

    return (await t.run(ctx => ctx.runMutation(runReference, { key }))) as Output;
}
