import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

describe("convex teamMembers", () => {
    test("create member, list by team, update role, delete", async () => {
        const t = convexTest(schema, modules);

        const { teamId, userId } = await t.run(async (ctx) => {
            const teamId = await ctx.db.insert("teams", {
                name: "Design",
                description: "Product design team",
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
            const userId = await ctx.db.insert("users", {});
            return { teamId, userId };
        });

        const created = await t.mutation(api.teamMembers.createTeamMember, {
            team: teamId as any,
            user: userId as any,
            role: "MEMBER",
        });
        expect((created as any).role).toBe("MEMBER");

        const list = await t.query(api.teamMembers.getTeamMembersByTeamId, { team: teamId as any });
        expect(list.length).toBe(1);
        expect((list[0] as any).email).toBe("");

        const updated = await t.mutation(api.teamMembers.updateTeamMember, {
            id: (created as any)._id,
            role: "MANAGER",
        });
        expect((updated as any).role).toBe("MANAGER");

        const result = await t.mutation(api.teamMembers.deleteTeamMember, { _id: (created as any)._id });
        expect(result).toBe("Team member deleted successfully");
    });
});


