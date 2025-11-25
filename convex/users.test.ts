// import { convexTest } from "convex-test";
// import { describe, expect, test, beforeEach } from "vitest";
// import { api } from "./_generated/api";
// import schema from "./schema";
// import { modules } from "./test.setup";

// describe("convex users", () => {
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
//         await t.withIdentity({ subject: userId });
//     });

//     test("getUser returns user ID when authenticated", async () => {
//         const user = await t.query(api.users.getUser, {});
//         expect(user).toBe(userId);
//     });

//     test("getUser returns null when unauthenticated", async () => {
//         const t2 = convexTest(schema, modules);
//         const user = await t2.query(api.users.getUser, {});
//         expect(user).toBeNull();
//     });

//     test("getAccountDetails returns user email and username", async () => {
//         const details = await t.query(api.users.getAccountDetails, {});
//         expect(details?.email).toBe("test@example.com");
//         expect(details?.username).toBe("Test User");
//     });

//     test("getAccountDetails throws when unauthenticated", async () => {
//         const t2 = convexTest(schema, modules);
//         await expect(t2.query(api.users.getAccountDetails, {})).rejects.toThrow(
//             /Unauthenticated|Unauthorized/
//         );
//     });

//     test("getUserRole returns role when user has role", async () => {
//         await t.run(async (ctx) => {
//             const userRecord = await ctx.db
//                 .query("user")
//                 .withIndex("userId", (q) => q.eq("userId", userId))
//                 .first();
//             if (userRecord) {
//                 await ctx.db.patch(userRecord._id, { role: "admin" } as any);
//             }
//         });

//         const role = await t.query(api.users.getUserRole, {});
//         expect(role?.role).toBe("admin");
//         expect(role?.userId).toBe(userId);
//     });

//     test("getUserRole returns null when user has no role", async () => {
//         const role = await t.query(api.users.getUserRole, {});
//         expect(role?.role).toBeNull();
//     });

//     test("getUserRole returns null when unauthenticated", async () => {
//         const t2 = convexTest(schema, modules);
//         const role = await t2.query(api.users.getUserRole, {});
//         expect(role).toBeNull();
//     });

//     test("updateAccountDetails updates email and username", async () => {
//         const result = await t.mutation(api.users.updateAccountDetails, {
//             email: "newemail@example.com",
//             username: "New Name",
//         });

//         expect(result?.message).toBe("Account details updated");
//         expect(result?.error).toBe(false);

//         const details = await t.query(api.users.getAccountDetails, {});
//         expect(details?.email).toBe("newemail@example.com");
//         expect(details?.username).toBe("New Name");
//     });

//     test("updateAccountDetails throws when unauthenticated", async () => {
//         const t2 = convexTest(schema, modules);
//         await expect(
//             t2.mutation(api.users.updateAccountDetails, {
//                 email: "new@example.com",
//                 username: "New",
//             })
//         ).rejects.toThrow(/Unauthenticated|Unauthorized/);
//     });

//     test("updateAccountDetails updates updatedAt timestamp", async () => {
//         const initialUser = await t.run(async (ctx) => {
//             return await ctx.db
//                 .query("user")
//                 .withIndex("userId", (q) => q.eq("userId", userId))
//                 .first();
//         });

//         await new Promise(resolve => setTimeout(resolve, 10));

//         await t.mutation(api.users.updateAccountDetails, {
//             email: "updated@example.com",
//             username: "Updated",
//         });

//         const updatedUser = await t.run(async (ctx) => {
//             return await ctx.db
//                 .query("user")
//                 .withIndex("userId", (q) => q.eq("userId", userId))
//                 .first();
//         });

//         expect(updatedUser?.updatedAt).toBeGreaterThan(initialUser?.updatedAt!);
//     });
// });
