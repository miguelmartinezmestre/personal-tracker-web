// import { convexTest } from "convex-test";
// import { describe, expect, test, beforeEach } from "vitest";
// import { api } from "./_generated/api";
// import schema from "./schema";
// import { modules } from "./test.setup";

// describe("convex objectives", () => {
//   let t: ReturnType<typeof convexTest>;
//   let userId: string;
//   let authToken: string;

//   beforeEach(async () => {
//     t = convexTest(schema, modules);
//     // Create a test user and authenticate
//     const result = await t.run(async (ctx) => {
//       // Insert user into betterAuth user table
//       const userRecord = await ctx.db.insert("user", {
//         userId: "test-user-123",
//         email: "test@example.com",
//         name: "Test User",
//         emailVerified: false,
//         createdAt: Date.now(),
//         updatedAt: Date.now(),
//       });
//       return { userId: "test-user-123", userRecordId: userRecord };
//     });
//     userId = result.userId;
//     // Mock authentication token
//     authToken = "test-token";
//   });

//   test("createObjective creates a new objective", async () => {
//     await t.withIdentity({ subject: userId });

//     const objectiveId = await t.mutation(api.objectives.createObjective, {
//       title: "Save for vacation",
//       description: "Initial savings goal",
//       category: "finance",
//       targetValue: 2000,
//       currentValue: 250,
//       deadline: Date.now() + 30 * 24 * 60 * 60 * 1000,
//       status: "not_started",
//       unit: "EUR",
//     });

//     expect(objectiveId).toBeDefined();

//     const objective = await t.run(async (ctx) => ctx.db.get(objectiveId));
//     expect(objective?.title).toBe("Save for vacation");
//     expect(objective?.description).toBe("Initial savings goal");
//     expect(objective?.category).toBe("finance");
//     expect(objective?.targetValue).toBe(2000);
//     expect(objective?.currentValue).toBe(250);
//     expect(objective?.status).toBe("not_started");
//     expect(objective?.unit).toBe("EUR");
//     expect(objective?.user).toBe(userId);
//   });

//   test("getObjectivesByUser returns user's objectives", async () => {
//     await t.withIdentity({ subject: userId });

//     // Create multiple objectives
//     const obj1 = await t.mutation(api.objectives.createObjective, {
//       title: "Objective 1",
//       targetValue: 100,
//       currentValue: 50,
//       status: "in_progress",
//     });

//     const obj2 = await t.mutation(api.objectives.createObjective, {
//       title: "Objective 2",
//       targetValue: 200,
//       currentValue: 100,
//       status: "not_started",
//     });

//     const objectives = await t.query(api.objectives.getObjectivesByUser, {});

//     expect(objectives).toHaveLength(2);
//     expect(objectives.map(o => o._id)).toContain(obj1);
//     expect(objectives.map(o => o._id)).toContain(obj2);
//   });

//   test("getObjectiveById returns a specific objective", async () => {
//     await t.withIdentity({ subject: userId });

//     const objectiveId = await t.mutation(api.objectives.createObjective, {
//       title: "Test Objective",
//       targetValue: 100,
//       currentValue: 50,
//       status: "in_progress",
//     });

//     const objective = await t.query(api.objectives.getObjectiveById, {
//       id: objectiveId,
//     });

//     expect(objective?._id).toBe(objectiveId);
//     expect(objective?.title).toBe("Test Objective");
//   });

//   test("updateObjective patches realistic fields", async () => {
//     await t.withIdentity({ subject: userId });

//     const { objectiveId } = await t.run(async (ctx) => {
//       const id = await ctx.db.insert("objectives", {
//         user: userId,
//         title: "Save for vacation",
//         description: "Initial savings goal",
//         category: "finance",
//         targetValue: 2000,
//         currentValue: 250,
//         deadline: Date.now() + 30 * 24 * 60 * 60 * 1000,
//         status: "not_started",
//         unit: "EUR",
//         createdAt: Date.now(),
//         updatedAt: Date.now(),
//       });
//       return { objectiveId: id };
//     });

//     await t.mutation(api.objectives.updateObjective, {
//       id: objectiveId,
//       title: "Save for summer vacation",
//       description: "Monthly savings",
//       category: "finance",
//       currentValue: 350,
//       deadline: Date.now() + 60 * 24 * 60 * 60 * 1000,
//       status: "in_progress",
//       unit: "EUR",
//     });

//     const updated = await t.run(async (ctx) => ctx.db.get(objectiveId));
//     expect(updated?.title).toBe("Save for summer vacation");
//     expect(updated?.description).toBe("Monthly savings");
//     expect(updated?.category).toBe("finance");
//     expect(updated?.currentValue).toBe(350);
//     expect(typeof updated?.deadline).toBe("number");
//     expect(updated?.status).toBe("in_progress");
//     expect(updated?.unit).toBe("EUR");
//     expect(typeof updated?.updatedAt).toBe("number");
//   });

//   test("deleteObjective removes the document", async () => {
//     await t.withIdentity({ subject: userId });

//     const { objectiveId } = await t.run(async (ctx) => {
//       const id = await ctx.db.insert("objectives", {
//         user: userId,
//         title: "Lose 5kg",
//         description: "Cut sugar & run 3x/week",
//         category: "health",
//         targetValue: 5,
//         currentValue: 1,
//         deadline: Date.now() + 45 * 24 * 60 * 60 * 1000,
//         status: "not_started",
//         unit: "kg",
//         createdAt: Date.now(),
//         updatedAt: Date.now(),
//       });
//       return { objectiveId: id };
//     });

//     await t.mutation(api.objectives.deleteObjective, { id: objectiveId });
//     const doc = await t.run(async (ctx) => ctx.db.get(objectiveId));
//     expect(doc).toBeNull();
//   });

//   test("partial update preserves unspecified fields", async () => {
//     await t.withIdentity({ subject: userId });

//     const initial = {
//       title: "Read 12 books",
//       description: "1 book per month",
//       category: "education",
//       targetValue: 12,
//       currentValue: 3,
//       deadline: Date.now() + 365 * 24 * 60 * 60 * 1000,
//       status: "not_started",
//       unit: "books",
//     };
//     const { objectiveId } = await t.run(async (ctx) => {
//       const id = await ctx.db.insert("objectives", {
//         user: userId,
//         ...initial,
//         createdAt: Date.now(),
//         updatedAt: Date.now(),
//       });
//       return { objectiveId: id };
//     });

//     await t.mutation(api.objectives.updateObjective, {
//       id: objectiveId,
//       status: "in_progress",
//     });

//     const after = await t.run(async (ctx) => ctx.db.get(objectiveId));
//     expect(after?.status).toBe("in_progress");
//     expect(after?.title).toBe(initial.title);
//     expect(after?.description).toBe(initial.description);
//     expect(after?.category).toBe(initial.category);
//     expect(after?.targetValue).toBe(initial.targetValue);
//     expect(after?.currentValue).toBe(initial.currentValue);
//     expect(after?.deadline).toBeTypeOf("number");
//     expect(after?.unit).toBe(initial.unit);
//   });

//   test("createObjective rejects when unauthenticated", async () => {
//     const t2 = convexTest(schema, modules);
//     await expect(
//       t2.mutation(api.objectives.createObjective, {
//         title: "x",
//         description: undefined,
//         category: undefined,
//         targetValue: 1,
//         currentValue: 0,
//         deadline: undefined,
//         status: "not_started",
//         unit: undefined,
//       })
//     ).rejects.toThrow(/Unauthenticated|User not authenticated/);
//   });

//   test("getObjectivesByUser rejects when unauthenticated", async () => {
//     const t2 = convexTest(schema, modules);
//     await expect(t2.query(api.objectives.getObjectivesByUser, {})).rejects.toThrow(
//       /Unauthenticated|User not authenticated/
//     );
//   });

//   test("updateObjective updates updatedAt timestamp", async () => {
//     await t.withIdentity({ subject: userId });

//     const { objectiveId, initialUpdatedAt } = await t.run(async (ctx) => {
//       const id = await ctx.db.insert("objectives", {
//         user: userId,
//         title: "Test",
//         targetValue: 100,
//         currentValue: 50,
//         status: "in_progress",
//         createdAt: Date.now(),
//         updatedAt: Date.now() - 1000, // 1 second ago
//       });
//       const obj = await ctx.db.get(id);
//       return { objectiveId: id, initialUpdatedAt: obj?.updatedAt };
//     });

//     // Wait a bit to ensure timestamp difference
//     await new Promise(resolve => setTimeout(resolve, 10));

//     await t.mutation(api.objectives.updateObjective, {
//       id: objectiveId,
//       currentValue: 75,
//     });

//     const updated = await t.run(async (ctx) => ctx.db.get(objectiveId));
//     expect(updated?.updatedAt).toBeGreaterThan(initialUpdatedAt!);
//   });

//   test("getObjectiveById returns null for non-existent objective", async () => {
//     await t.withIdentity({ subject: userId });

//     // Create a valid ID format for objectives table
//     const fakeId = await t.run(async (ctx) => {
//       // Create a temporary objective to get a valid ID format, then delete it
//       const tempId = await ctx.db.insert("objectives", {
//         user: userId,
//         title: "temp",
//         targetValue: 1,
//         currentValue: 0,
//         status: "not_started",
//         createdAt: Date.now(),
//         updatedAt: Date.now(),
//       });
//       await ctx.db.delete(tempId);
//       // Return a non-existent but valid format ID
//       return tempId;
//     });

//     const objective = await t.query(api.objectives.getObjectiveById, {
//       id: fakeId,
//     });

//     expect(objective).toBeNull();
//   });
// });
