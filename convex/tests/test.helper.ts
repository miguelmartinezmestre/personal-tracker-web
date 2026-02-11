import { convexTest } from 'convex-test';
import schema from '../schema';

export const modules = import.meta.glob('../**/*.*s');

export function initConvexTest() {
    const t = convexTest(schema, modules);
    return t;
}
