import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

describe("convex sessions", () => {
    test("invalidateSession updates status to inactive", async () => {
        const t = convexTest(schema, modules);
        const sessionId = await t.run(async (ctx) => {
            const userId = await ctx.db.insert("users", {});
            return await ctx.db.insert("sessions", {
                user: userId,
                value: "token-1",
                status: "active",
                userAgent: "Mozilla/5.0",
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
        });

        const res = await t.mutation(api.sessions.invalidateSession, { _id: sessionId as any });
        expect(res).toMatchObject({ message: "Session invalidated" });

        const after = await t.run(async (ctx) => ctx.db.get(sessionId as any));
        expect((after as any).status).toBe("inactive");
    });

    test("getSessionsByUser rejects unauthenticated", async () => {
        const t = convexTest(schema, modules);
        await expect(t.query(api.sessions.getSessionsByUser, {})).rejects.toThrow("User not authenticated");
    });
});


