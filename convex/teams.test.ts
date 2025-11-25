// import { convexTest } from "convex-test";
// import { describe, expect, test, beforeEach } from "vitest";
// import { api } from "./_generated/api";
// import schema from "./schema";
// import { modules } from "./test.setup";

// describe("convex teams", () => {
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

//     test("createTeam creates a new team with slug", async () => {
//         const team = await t.mutation(api.teams.createTeam, {
//             name: "Engineering Team",
//             description: "Our awesome engineering team",
//         });

//         expect(team).toBeDefined();
//         expect(team?.name).toBe("Engineering Team");
//         expect(team?.description).toBe("Our awesome engineering team");
//         expect(team?.slug).toBe("engineering-team");
//     });

//     test("createTeam generates unique slugs", async () => {
//         const team1 = await t.mutation(api.teams.createTeam, {
//             name: "Test Team",
//             description: "First team",
//         });

//         const team2 = await t.mutation(api.teams.createTeam, {
//             name: "Test Team",
//             description: "Second team",
//         });

//         expect(team1?.slug).toBe("test-team");
//         expect(team2?.slug).toBe("test-team-1");
//     });

//     test("createTeam adds creator as owner", async () => {
//         const team = await t.mutation(api.teams.createTeam, {
//             name: "My Team",
//             description: "Description",
//         });

//         const members = await t.run(async (ctx) => {
//             return await ctx.db
//                 .query("member")
//                 .withIndex("organizationId", (q) => q.eq("organizationId", String(team._id)))
//                 .collect();
//         });

//         expect(members).toHaveLength(1);
//         expect(members[0]?.userId).toBe(userId);
//         expect(members[0]?.role).toBe("owner");
//     });

//     test("getTeams returns teams where user is a member", async () => {
//         const team1 = await t.mutation(api.teams.createTeam, {
//             name: "Team 1",
//             description: "Description 1",
//         });

//         const team2 = await t.mutation(api.teams.createTeam, {
//             name: "Team 2",
//             description: "Description 2",
//         });

//         const teams = await t.query(api.teams.getTeams, {});

//         expect(teams).toHaveLength(2);
//         expect(teams.map(t => t._id)).toContain(team1._id);
//         expect(teams.map(t => t._id)).toContain(team2._id);
//     });

//     test("getTeamById returns a specific team", async () => {
//         const team = await t.mutation(api.teams.createTeam, {
//             name: "Test Team",
//             description: "Test Description",
//         });

//         const retrieved = await t.query(api.teams.getTeamById, {
//             _id: team._id,
//         });

//         expect(retrieved?._id).toBe(team._id);
//         expect(retrieved?.name).toBe("Test Team");
//     });

//     test("updateTeam modifies team details", async () => {
//         const team = await t.mutation(api.teams.createTeam, {
//             name: "Old Name",
//             description: "Old Description",
//         });

//         const updated = await t.mutation(api.teams.updateTeam, {
//             _id: team._id,
//             name: "New Name",
//             description: "New Description",
//         });

//         expect(updated?.name).toBe("New Name");
//         expect(updated?.description).toBe("New Description");
//     });

//     test("deleteTeam removes team and all members", async () => {
//         const team = await t.mutation(api.teams.createTeam, {
//             name: "Team to Delete",
//             description: "Description",
//         });

//         // Add another member
//         await t.run(async (ctx) => {
//             await ctx.db.insert("member", {
//                 organizationId: String(team._id),
//                 userId: "other-user",
//                 role: "member",
//                 createdAt: Date.now(),
//             });
//         });

//         const result = await t.mutation(api.teams.deleteTeam, {
//             _id: team._id,
//         });

//         expect(result).toBe("Team deleted successfully");

//         const deleted = await t.run(async (ctx) => ctx.db.get(team._id));
//         expect(deleted).toBeNull();

//         const members = await t.run(async (ctx) => {
//             return await ctx.db
//                 .query("member")
//                 .withIndex("organizationId", (q) => q.eq("organizationId", String(team._id)))
//                 .collect();
//         });
//         expect(members).toHaveLength(0);
//     });

//     test("createTeam rejects when unauthenticated", async () => {
//         const t2 = convexTest(schema, modules);
//         await expect(
//             t2.mutation(api.teams.createTeam, {
//                 name: "Test",
//                 description: "Test",
//             })
//         ).rejects.toThrow(/Unauthenticated|User not authenticated/);
//     });

//     test("getTeams rejects when unauthenticated", async () => {
//         const t2 = convexTest(schema, modules);
//         await expect(t2.query(api.teams.getTeams, {})).rejects.toThrow(
//             /Unauthenticated|User not authenticated/
//         );
//     });

//     test("createTeam handles special characters in name", async () => {
//         const team = await t.mutation(api.teams.createTeam, {
//             name: "Team @#$%^&*()!",
//             description: "Description",
//         });

//         expect(team?.slug).toMatch(/^team-[a-z0-9-]+$/);
//     });
// });
