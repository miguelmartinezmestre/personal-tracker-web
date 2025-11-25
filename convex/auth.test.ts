// import { convexTest } from "convex-test";
// import { describe, expect, test, beforeEach } from "vitest";
// import { api } from "./_generated/api";
// import schema from "./schema";
// import { modules } from "./test.setup";

// describe("convex auth", () => {
//     let t: ReturnType<typeof convexTest>;
//     let userId: string;

//     beforeEach(async () => {
//         t = convexTest(schema, modules);
//         await t.run(async (ctx) => {
//             const userRecord = await ctx.db.insert("user", {
//                 userId: "test-user-123",
//                 email: "test@example.com",
//                 name: "Test User",
//                 emailVerified: false,
//                 createdAt: Date.now(),
//                 updatedAt: Date.now(),
//             });
//             return { userId: "test-user-123" };
//         });
//         userId = "test-user-123";
//     });

//     test("getCurrentUser returns null when unauthenticated", async () => {
//         const current = await t.query(api.auth.getCurrentUser, {});
//         expect(current).toBeNull();
//     });

//     test("getCurrentUser returns user when authenticated", async () => {
//         await t.withIdentity({ subject: userId });
//         const current = await t.query(api.auth.getCurrentUser, {});
//         expect(current).not.toBeNull();
//         expect(current?._id).toBeDefined();
//     });

//     test("isAuthenticated returns user when authenticated", async () => {
//         await t.withIdentity({ subject: userId });
//         const user = await t.query(api.auth.isAuthenticated, {});
//         expect(user).not.toBeNull();
//         expect(user?._id).toBeDefined();
//     });

//     test("isAuthenticated returns null when unauthenticated", async () => {
//         const t2 = convexTest(schema, modules);
//         // isAuthenticated throws error instead of returning null when unauthenticated
//         await expect(t2.query(api.auth.isAuthenticated, {})).rejects.toThrow();
//     });
// });


