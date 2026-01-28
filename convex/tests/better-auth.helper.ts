import { convexTest } from 'convex-test';
import componentSchema from '../betterAuth/schema';
import schema from '../schema';

export const componentModules = import.meta.glob("./convex/betterAuth/**/*.ts");
export const modules = import.meta.glob("./**/*.*s");

export function initConvexTest() {
  const t = convexTest(schema, modules);
  t.registerComponent("betterAuth", componentSchema, componentModules);
  return t;
}
