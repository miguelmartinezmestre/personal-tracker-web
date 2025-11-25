// import { convexTest } from "convex-test";
// import { describe, expect, test, beforeEach } from "vitest";
// import { api } from "./_generated/api";
// import schema from "./schema";
// import { modules } from "./test.setup";

// describe("convex auditLogs", () => {
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

//     test("getAuditLogs returns audit logs sorted by date", async () => {
//         // Create some audit logs
//         await t.run(async (ctx) => {
//             const now = Date.now();
//             await ctx.db.insert("auditLogs", {
//                 user: userId,
//                 action: "CREATE_OBJECTIVE",
//                 createdAt: now - 2000,
//                 updatedAt: now - 2000,
//             });
//             await ctx.db.insert("auditLogs", {
//                 user: userId,
//                 action: "UPDATE_OBJECTIVE",
//                 createdAt: now - 1000,
//                 updatedAt: now - 1000,
//             });
//             await ctx.db.insert("auditLogs", {
//                 user: userId,
//                 action: "DELETE_OBJECTIVE",
//                 createdAt: now,
//                 updatedAt: now,
//             });
//         });

//         const logs = await t.query(api.auditLogs.getAuditLogs, {});

//         expect(logs.length).toBeGreaterThanOrEqual(3);
//         // Should be sorted descending (most recent first)
//         for (let i = 0; i < logs.length - 1; i++) {
//             expect(logs[i]?.createdAt).toBeGreaterThanOrEqual(logs[i + 1]?.createdAt!);
//         }
//     });

//     test("getAuditLogs limits to 100 logs", async () => {
//         // Create more than 100 logs
//         await t.run(async (ctx) => {
//             const now = Date.now();
//             for (let i = 0; i < 150; i++) {
//                 await ctx.db.insert("auditLogs", {
//                     user: userId,
//                     action: `ACTION_${i}`,
//                     createdAt: now - i * 1000,
//                     updatedAt: now - i * 1000,
//                 });
//             }
//         });

//         const logs = await t.query(api.auditLogs.getAuditLogs, {});

//         expect(logs.length).toBeLessThanOrEqual(100);
//     });

//     test("getAuditLogs returns empty array when no logs exist", async () => {
//         const logs = await t.query(api.auditLogs.getAuditLogs, {});
//         expect(Array.isArray(logs)).toBe(true);
//     });
// });

