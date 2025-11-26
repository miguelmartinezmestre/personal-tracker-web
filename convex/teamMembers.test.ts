import { convexTest } from "convex-test";
import { describe, expect, test, beforeEach } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "../test.setup";
import { createTestUsers } from "./test-helpers";

describe("convex teamMembers", () => {
    let t: ReturnType<typeof convexTest>;
    let userId: string;
    let teamId: any;
    let otherUserId: string;

    t = convexTest(schema, modules);

    const userIdentity = t.withIdentity({
        subject: "test-user-123",
        role: "admin",
    });

    beforeEach(async () => {
        // Create complete test users with accounts (similar to better-auth sign-up)
        const results = await userIdentity.run(async (ctx) => {
            return await createTestUsers(ctx, [
                {
                    userId: "test-user-123",
                    email: "test@example.com",
                    name: "Test User",
                    password: "test-password",
                    role: "admin",
                    emailVerified: false,
                },
                {
                    userId: "other-user-456",
                    email: "other@example.com",
                    name: "Other User",
                    password: "test-password",
                    emailVerified: false,
                },
            ]);
        });
        userId = results[0]!.userId;
        otherUserId = results[1]!.userId;

        teamId = await userIdentity.run(async (ctx) => {
            const orgId = await ctx.db.insert("organization", {
                name: "Test Team",
                slug: "test-team",
                description: "Test Description",
                createdAt: Date.now(),
            });
            await ctx.db.insert("member", {
                organizationId: String(orgId),
                userId: userId,
                role: "owner",
                createdAt: Date.now(),
            });
            return orgId;
        });
    });

    test("createTeamMember adds a new member", async () => {
        const member = await userIdentity.mutation(api.teamMembers.createTeamMember, {
            team: teamId,
            user: otherUserId,
            role: "MEMBER",
        });

        expect(member).toBeDefined();
        expect(member?.userId).toBe(otherUserId);
        expect(member?.role).toBe("member"); // Better-auth role
    });

    test("createTeamMember maps MANAGER role to admin", async () => {
        const member = await userIdentity.mutation(api.teamMembers.createTeamMember, {
            team: teamId,
            user: otherUserId,
            role: "MANAGER",
        });

        expect(member?.role).toBe("admin");
    });

    test("createTeamMember rejects duplicate members", async () => {
        await userIdentity.mutation(api.teamMembers.createTeamMember, {
            team: teamId,
            user: otherUserId,
            role: "MEMBER",
        });

        await expect(
            userIdentity.mutation(api.teamMembers.createTeamMember, {
                team: teamId,
                user: otherUserId,
                role: "MEMBER",
            })
        ).rejects.toThrow("Member already exists in this organization");
    });

    test("getTeamMembersByTeamId returns all members with user info", async () => {
        await userIdentity.mutation(api.teamMembers.createTeamMember, {
            team: teamId,
            user: otherUserId,
            role: "MEMBER",
        });

        const members = await userIdentity.query(api.teamMembers.getTeamMembersByTeamId, {
            team: teamId,
        });

        expect(members.length).toBeGreaterThanOrEqual(2);
        const otherMember = members.find(m => m.userId === otherUserId);
        expect(otherMember).toBeDefined();
        expect(otherMember?.email).toBe("other@example.com");
        expect(otherMember?.role).toBe("MEMBER"); // Mapped back to frontend role
    });

    test("updateTeamMember changes member role", async () => {
        const memberId = await userIdentity.run(async (ctx) => {
            const id = await ctx.db.insert("member", {
                organizationId: String(teamId),
                userId: otherUserId,
                role: "member",
                createdAt: Date.now(),
            });
            return id;
        });

        const updated = await userIdentity.mutation(api.teamMembers.updateTeamMember, {
            id: memberId,
            role: "MANAGER",
        });

        expect(updated?.role).toBe("admin");
    });

    test("deleteTeamMember removes a member", async () => {
        const memberId = await userIdentity.run(async (ctx) => {
            return await ctx.db.insert("member", {
                organizationId: String(teamId),
                userId: otherUserId,
                role: "member",
                createdAt: Date.now(),
            });
        });

        const result = await userIdentity.mutation(api.teamMembers.deleteTeamMember, {
            _id: memberId,
        });

        expect(result).toBe("Team member deleted successfully");

        const deleted = await userIdentity.run(async (ctx) => ctx.db.get(memberId));
        expect(deleted).toBeNull();
    });

    test("createTeamMember rejects when unauthenticated", async () => {
        await expect(
            t.mutation(api.teamMembers.createTeamMember, {
                team: teamId,
                user: otherUserId,
                role: "MEMBER",
            })
        ).rejects.toThrow(/Unauthenticated|User not authenticated/);
    });

    test("getTeamMembersByTeamId maps owner role to MANAGER", async () => {
        const members = await userIdentity.query(api.teamMembers.getTeamMembersByTeamId, {
            team: teamId,
        });

        const ownerMember = members.find(m => m.userId === userId);
        expect(ownerMember?.role).toBe("MANAGER");
    });
});
