// import { convexTest } from "convex-test";
// import { describe, expect, test, beforeEach } from "vitest";
// import { api } from "./_generated/api";
// import schema from "./schema";
// import { modules } from "./test.setup";

// describe("convex sessions", () => {
//     let t: ReturnType<typeof convexTest>;
//     let userId: string;
//     let sessionId: any;

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

//         sessionId = await t.run(async (ctx) => {
//             return await ctx.db.insert("session", {
//                 userId: userId,
//                 expiresAt: Date.now() + 1000000,
//                 token: "test-token",
//                 ipAddress: "127.0.0.1",
//                 userAgent: "test-agent",
//                 createdAt: Date.now(),
//                 updatedAt: Date.now(),
//             });
//         });
//     });

//     test("getSessionsByUser returns user's sessions", async () => {
//         // Create another session
//         await t.run(async (ctx) => {
//             await ctx.db.insert("session", {
//                 userId: userId,
//                 expiresAt: Date.now() + 1000000,
//                 token: "test-token-2",
//                 ipAddress: "127.0.0.1",
//                 userAgent: "test-agent",
//                 createdAt: Date.now(),
//                 updatedAt: Date.now(),
//             });
//         });

//         const sessions = await t.query(api.sessions.getSessionsByUser, {});

//         expect(sessions.length).toBeGreaterThanOrEqual(2);
//         expect(sessions.map(s => s.userId)).every(id => id === userId);
//     });

//     test("getSessionsByUser rejects when unauthenticated", async () => {
//         const t2 = convexTest(schema, modules);
//         await expect(t2.query(api.sessions.getSessionsByUser, {})).rejects.toThrow(
//             /Unauthenticated|User not authenticated/
//         );
//     });

//     test("invalidateSession updates session updatedAt", async () => {
//         const initialSession = await t.run(async (ctx) => {
//             return await ctx.db.get(sessionId);
//         });

//         await new Promise(resolve => setTimeout(resolve, 10));

//         const result = await t.mutation(api.sessions.invalidateSession, {
//             _id: sessionId,
//         });

//         expect(result?.message).toBe("Session invalidated");

//         const updatedSession = await t.run(async (ctx) => {
//             return await ctx.db.get(sessionId);
//         });

//         expect(updatedSession?.updatedAt).toBeGreaterThan(initialSession?.updatedAt!);
//     });
// });
