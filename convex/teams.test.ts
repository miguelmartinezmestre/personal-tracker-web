import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

describe("convex teams", () => {
    test("create, read, update, delete team (realistic)", async () => {
        const t = convexTest(schema, modules);

        const created = await t.mutation(api.teams.createTeam, {
            name: "Engineering",
            description: "Builds product features",
        });
        expect(created?.name).toBe("Engineering");

        const list = await t.query(api.teams.getTeams, {});
        expect(list.length).toBe(1);

        const fetched = await t.query(api.teams.getTeamById, { _id: (created as any)._id });
        expect(fetched?.description).toBe("Builds product features");

        const updated = await t.mutation(api.teams.updateTeam, {
            _id: (created as any)._id,
            name: "Platform Engineering",
            description: "Enables product teams",
        });
        expect(updated?.name).toBe("Platform Engineering");
        expect(updated?.description).toBe("Enables product teams");

        const result = await t.mutation(api.teams.deleteTeam, { _id: (created as any)._id });
        expect(result).toBe("Team deleted successfully");

        const after = await t.query(api.teams.getTeams, {});
        expect(after.length).toBe(0);
    });
});


