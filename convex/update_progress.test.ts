import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

describe("convex update_progress", () => {
    test("update & delete progress; list by objective; create rejects unauthenticated", async () => {
        const t = convexTest(schema, modules);

        const { objectiveId, progressId } = await t.run(async (ctx) => {
            const userId = await ctx.db.insert("users", {});
            const objectiveId = await ctx.db.insert("objectives", {
                user: userId,
                title: "10k steps",
                targetValue: 10000,
                currentValue: 3000,
                status: "in_progress",
                createdAt: Date.now(),
                updatedAt: Date.now(),
            } as any);
            const progressId = await ctx.db.insert("progressUpdates", {
                objective: objectiveId,
                updatedValue: 4500,
                updateDate: Date.now(),
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
            return { objectiveId, progressId };
        });

        // update
        const updated = await t.mutation(api.update_progress.updateUpdateProgress, {
            id: progressId as any,
            updatedValue: 6000,
            updateDate: Date.now(),
            comment: "Evening walk",
        });
        expect((updated as any).updatedValue).toBe(6000);
        expect((updated as any).comment).toBe("Evening walk");

        // list by objective
        const list = await t.query(api.update_progress.getUpdateProgressByObjectiveId, {
            objectiveId: objectiveId as any,
        });
        expect(list.length).toBe(1);

        // delete
        const result = await t.mutation(api.update_progress.deleteUpdateProgress, { _id: progressId as any });
        expect(result).toBe("Update progress deleted successfully");

        // create requires auth
        await expect(
            t.mutation(api.update_progress.createUpdateProgress, {
                objective: objectiveId as any,
                updatedValue: 7000,
                updateDate: Date.now(),
                comment: "Morning run",
            })
        ).rejects.toThrow("User not authenticated");
    });
});


