import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

describe("convex objectives", () => {
  test("updateObjective patches realistic fields", async () => {
    const t = convexTest(schema, modules);
    const { objectiveId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {});
      const id = await ctx.db.insert("objectives", {
        user: userId,
        title: "Save for vacation",
        description: "Initial savings goal",
        category: "finance",
        targetValue: 2000,
        currentValue: 250,
        deadline: Date.now() + 30 * 24 * 60 * 60 * 1000,
        status: "not_started",
        unit: "EUR",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return { objectiveId: id };
    });

    await t.mutation(api.objectives.updateObjective, {
      id: objectiveId,
      title: "Save for summer vacation",
      description: "Monthly savings",
      category: "finance",
      currentValue: 350,
      deadline: Date.now() + 60 * 24 * 60 * 60 * 1000,
      status: "in_progress",
      unit: "EUR",
    });

    const updated = await t.run(async (ctx) => ctx.db.get(objectiveId));
    expect(updated?.title).toBe("Save for summer vacation");
    expect(updated?.description).toBe("Monthly savings");
    expect(updated?.category).toBe("finance");
    expect(updated?.currentValue).toBe(350);
    expect(typeof updated?.deadline).toBe("number");
    expect(updated?.status).toBe("in_progress");
    expect(updated?.unit).toBe("EUR");
    expect(typeof updated?.updatedAt).toBe("number");
  });

  test("deleteObjective removes the document", async () => {
    const t = convexTest(schema, modules);
    const { objectiveId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {});
      const id = await ctx.db.insert("objectives", {
        user: userId,
        title: "Lose 5kg",
        description: "Cut sugar & run 3x/week",
        category: "health",
        targetValue: 5,
        currentValue: 1,
        deadline: Date.now() + 45 * 24 * 60 * 60 * 1000,
        status: "not_started",
        unit: "kg",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return { objectiveId: id };
    });

    await t.mutation(api.objectives.deleteObjective, { id: objectiveId });
    const doc = await t.run(async (ctx) => ctx.db.get(objectiveId));
    expect(doc).toBeNull();
  });

  test("partial update preserves unspecified fields", async () => {
    const t = convexTest(schema, modules);
    const initial = {
      title: "Read 12 books",
      description: "1 book per month",
      category: "education",
      targetValue: 12,
      currentValue: 3,
      deadline: Date.now() + 365 * 24 * 60 * 60 * 1000,
      status: "not_started",
      unit: "books",
    };
    const { objectiveId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {});
      const id = await ctx.db.insert("objectives", {
        user: userId,
        ...initial,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return { objectiveId: id };
    });

    await t.mutation(api.objectives.updateObjective, {
      id: objectiveId,
      status: "in_progress",
    });

    const after = await t.run(async (ctx) => ctx.db.get(objectiveId));
    expect(after?.status).toBe("in_progress");
    expect(after?.title).toBe(initial.title);
    expect(after?.description).toBe(initial.description);
    expect(after?.category).toBe(initial.category);
    expect(after?.targetValue).toBe(initial.targetValue);
    expect(after?.currentValue).toBe(initial.currentValue);
    expect(after?.deadline).toBeTypeOf("number");
    expect(after?.unit).toBe(initial.unit);
  });

  test("createObjective rejects when unauthenticated", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.objectives.createObjective, {
        title: "x",
        description: undefined,
        category: undefined,
        targetValue: 1,
        currentValue: 0,
        deadline: undefined,
        status: "not_started",
        unit: undefined,
      })
    ).rejects.toThrow("User not authenticated");
  });

  test("getObjectivesByUser rejects when unauthenticated", async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.objectives.getObjectivesByUser, {})).rejects.toThrow(
      "User not authenticated"
    );
  });
});