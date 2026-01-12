import type { TestConvex } from 'convex-test';
import type { GenericSchema, SchemaDefinition } from 'convex/server';
import schema from './convex/betterAuth/schema';

type GlobImport = (pattern: string) => Record<string, () => Promise<unknown>>;
const modules = (import.meta as ImportMeta & { glob: GlobImport }).glob(
    './convex/betterAuth/**/*.ts'
);

/**
 * Register the component with the test convex instance.
 * @param t - The test convex instance, e.g. from calling `convexTest`.
 * @param name - The name of the component, as registered in convex.config.ts.
 */
export function register(
    t: TestConvex<SchemaDefinition<GenericSchema, boolean>>,
    name: string = 'betterAuth'
) {
    t.registerComponent(name, schema, modules);
}

export type ComponentRunner = {
    runInComponent?: <T>(componentPath: string, fn: (ctx: any) => Promise<T>) => Promise<T>;
};

/**
 * Run code inside the Better Auth component context (tests only).
 * Requires the component to be registered first via `register(...)`.
 */
export async function runInBetterAuth<T>(
    t: ComponentRunner,
    fn: (ctx: any) => Promise<T>,
    name: string = 'betterAuth'
) {
    const runner = (t as any).runInComponent as
        | ((componentPath: string, fn: (ctx: any) => Promise<T>) => Promise<T>)
        | undefined;
    if (!runner) {
        throw new Error(
            'runInComponent is not available. Ensure you are using convexTest() in tests.'
        );
    }
    return runner(name, fn);
}
export default { register, schema, modules };
