import { convexTest } from 'convex-test';
import workflowComponent from '@convex-dev/workflow/test';
import { afterAll } from 'vitest';
import schema from '../schema';
import { modules } from './test.setup';
import type { Id } from '../_generated/dataModel';
import { getDefaultTestSessionId } from './test_helpers';

export { modules };

async function drainScheduledFunctions(t: ReturnType<typeof convexTest>) {
    for (let i = 0; i < 20; i++) {
        await new Promise<void>(resolve => setTimeout(resolve, 0));
        await t.finishInProgressScheduledFunctions();
    }
}

export function initConvexTest(options?: { workflow?: boolean }) {
    const t = convexTest(schema, modules);
    if (options?.workflow ?? true) {
        workflowComponent.register(t);
    }

    const withIdentity = t.withIdentity.bind(t);
    t.withIdentity = ((identity: Parameters<typeof t.withIdentity>[0]) => {
        if (!identity.sessionId) {
            const sessionId = getDefaultTestSessionId(t, identity.subject as Id<'user'>);
            if (sessionId) {
                return withIdentity({ ...identity, sessionId });
            }
        }

        return withIdentity(identity);
    }) as typeof t.withIdentity;

    afterAll(async () => {
        await drainScheduledFunctions(t);
    });

    return t;
}
