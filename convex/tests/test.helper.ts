import { convexTest } from 'convex-test';
import workflowComponent from '@convex-dev/workflow/test';
import schema from '../schema';
import { modules } from './test.setup';

export { modules };

export function initConvexTest(options?: { workflow?: boolean }) {
    const t = convexTest(schema, modules);
    if (options?.workflow) {
        workflowComponent.register(t);
    }
    return t;
}
