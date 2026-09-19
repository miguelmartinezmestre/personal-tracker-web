import aggregateComponent from '@convex-dev/aggregate/test';
import { convexTest } from 'convex-test';
import { afterAll } from 'vitest';
import schema from '../schema';
import { modules } from './test.setup';
import { getDefaultTestSessionId } from './test_helpers';
import { asInvalidArg, asTestId } from './testCasts';

export { modules };

export async function drainScheduledFunctions(t: ReturnType<typeof convexTest>) {
    for (let i = 0; i < 20; i++) {
        await new Promise<void>(resolve => setTimeout(resolve, 0));
        await t.finishInProgressScheduledFunctions();
    }
}

export function initConvexTest() {
    process.env.BETTER_AUTH_SECRET ??= 'synthetic-secret-for-convex-pagination-tests-only';
    const t = convexTest(schema, modules);
    aggregateComponent.register(t, 'dashboardObjectives');
    aggregateComponent.register(t, 'dashboardProgress');

    const withIdentity = t.withIdentity.bind(t);
    const withIdentityAndSession = (identity: Parameters<typeof t.withIdentity>[0]) => {
        if (!identity.sessionId && identity.subject) {
            const sessionId = getDefaultTestSessionId(t, asTestId<'user'>(identity.subject));
            if (sessionId) {
                return withIdentity({ ...identity, sessionId });
            }
        }

        return withIdentity(identity);
    };
    t.withIdentity = asInvalidArg<typeof t.withIdentity>(withIdentityAndSession);

    afterAll(async () => {
        await drainScheduledFunctions(t);
    });

    return t;
}
