import { convexTest } from 'convex-test';
import schema from '../schema';
import { modules } from './test.setup';

export { modules };

export function initConvexTest() {
    return convexTest(schema, modules);
}
