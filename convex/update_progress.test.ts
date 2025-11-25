// import { convexTest } from "convex-test";
// import { describe, expect, test, beforeEach } from "vitest";
// import { api } from "./_generated/api";
// import schema from "./schema";
// import { modules } from "./test.setup";

// describe("convex update_progress", () => {
//     let t: ReturnType<typeof convexTest>;
//     let userId: string;
//     let objectiveId: any;

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

//         objectiveId = await t.run(async (ctx) => {
//             return await ctx.db.insert("objectives", {
//                 user: userId,
//                 title: "Test Objective",
//                 targetValue: 100,
//                 currentValue: 50,
//                 status: "in_progress",
//                 createdAt: Date.now(),
//                 updatedAt: Date.now(),
//             });
//         });
//     });

//     test("createUpdateProgress creates a new progress update", async () => {
//         const updateDate = Date.now();
//         const progressUpdate = await t.mutation(api.update_progress.createUpdateProgress, {
//             objective: objectiveId,
//             updatedValue: 75,
//             updateDate,
//             comment: "Great progress!",
//         });

//         expect(progressUpdate).toBeDefined();
//         expect(progressUpdate?.updatedValue).toBe(75);
//         expect(progressUpdate?.updateDate).toBe(updateDate);
//         expect(progressUpdate?.comment).toBe("Great progress!");
//         expect(progressUpdate?.objective).toBe(objectiveId);
//     });

//     test("createUpdateProgress works without comment", async () => {
//         const updateDate = Date.now();
//         const progressUpdate = await t.mutation(api.update_progress.createUpdateProgress, {
//             objective: objectiveId,
//             updatedValue: 80,
//             updateDate,
//         });

//         expect(progressUpdate?.updatedValue).toBe(80);
//         expect(progressUpdate?.comment).toBeUndefined();
//     });

//     test("getUpdateProgressByObjectiveId returns all updates for an objective", async () => {
//         const updateDate1 = Date.now();
//         const updateDate2 = Date.now() + 1000;

//         await t.mutation(api.update_progress.createUpdateProgress, {
//             objective: objectiveId,
//             updatedValue: 60,
//             updateDate: updateDate1,
//             comment: "First update",
//         });

//         await t.mutation(api.update_progress.createUpdateProgress, {
//             objective: objectiveId,
//             updatedValue: 70,
//             updateDate: updateDate2,
//             comment: "Second update",
//         });

//         const updates = await t.query(api.update_progress.getUpdateProgressByObjectiveId, {
//             objectiveId,
//         });

//         expect(updates).toHaveLength(2);
//         expect(updates.map(u => u.updatedValue)).toContain(60);
//         expect(updates.map(u => u.updatedValue)).toContain(70);
//     });

//     test("updateUpdateProgress modifies an existing update", async () => {
//         const updateDate = Date.now();
//         const progressUpdateId = await t.run(async (ctx) => {
//             const id = await ctx.db.insert("progressUpdates", {
//                 objective: objectiveId,
//                 updatedValue: 60,
//                 updateDate,
//                 comment: "Initial comment",
//                 createdAt: Date.now(),
//                 updatedAt: Date.now(),
//             });
//             return id;
//         });

//         const newUpdateDate = Date.now() + 2000;
//         const updated = await t.mutation(api.update_progress.updateUpdateProgress, {
//             id: progressUpdateId,
//             updatedValue: 85,
//             updateDate: newUpdateDate,
//             comment: "Updated comment",
//         });

//         expect(updated?.updatedValue).toBe(85);
//         expect(updated?.updateDate).toBe(newUpdateDate);
//         expect(updated?.comment).toBe("Updated comment");
//     });

//     test("deleteUpdateProgress removes an update", async () => {
//         const progressUpdateId = await t.run(async (ctx) => {
//             return await ctx.db.insert("progressUpdates", {
//                 objective: objectiveId,
//                 updatedValue: 60,
//                 updateDate: Date.now(),
//                 createdAt: Date.now(),
//                 updatedAt: Date.now(),
//             });
//         });

//         const result = await t.mutation(api.update_progress.deleteUpdateProgress, {
//             _id: progressUpdateId,
//         });

//         expect(result).toBe("Update progress deleted successfully");

//         const deleted = await t.run(async (ctx) => ctx.db.get(progressUpdateId));
//         expect(deleted).toBeNull();
//     });

//     test("createUpdateProgress rejects when unauthenticated", async () => {
//         const t2 = convexTest(schema, modules);
//         await expect(
//             t2.mutation(api.update_progress.createUpdateProgress, {
//                 objective: objectiveId,
//                 updatedValue: 75,
//                 updateDate: Date.now(),
//             })
//         ).rejects.toThrow(/Unauthenticated|User not authenticated/);
//     });

//     test("updateUpdateProgress updates updatedAt timestamp", async () => {
//         const progressUpdateId = await t.run(async (ctx) => {
//             const id = await ctx.db.insert("progressUpdates", {
//                 objective: objectiveId,
//                 updatedValue: 60,
//                 updateDate: Date.now(),
//                 createdAt: Date.now(),
//                 updatedAt: Date.now() - 1000,
//             });
//             const update = await ctx.db.get(id);
//             return { id, initialUpdatedAt: update?.updatedAt };
//         });

//         await new Promise(resolve => setTimeout(resolve, 10));

//         const updated = await t.mutation(api.update_progress.updateUpdateProgress, {
//             id: progressUpdateId.id,
//             updatedValue: 85,
//             updateDate: Date.now(),
//         });

//         expect(updated?.updatedAt).toBeGreaterThan(progressUpdateId.initialUpdatedAt!);
//     });
// });
