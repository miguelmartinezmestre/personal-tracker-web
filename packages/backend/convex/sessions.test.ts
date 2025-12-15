import { convexTest } from "convex-test";
import { describe, expect, test, beforeEach } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "../test.setup";
import { createTestUser } from "./test_helpers";

describe("convex sessions", () => {
    const t = convexTest(schema, modules);
    let userId: string;
    let sessionId: string;

    const userIdentity = t.withIdentity({
        subject: "test-user-123",
        role: "admin",
    });

    beforeEach(async () => {
        // Create a complete test user with account (similar to better-auth sign-up)
        const result = await userIdentity.run(async (ctx) => {
            return await createTestUser(ctx, {
                userId: "test-user-123",
                email: "test@example.com",
                name: "Test User",
                password: "test-password",
                role: "admin",
                emailVerified: false,
            });
        });
        userId = result.userId;

        sessionId = await userIdentity.run(async (ctx) => {
            return await ctx.db.insert("session", {
                userId: userId,
                expiresAt: Date.now() + 1000000,
                token: "test-token",
                ipAddress: "127.0.0.1",
                userAgent: "test-agent",
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
        });
    });

    test("getSessionsByUser returns user's sessions", async () => {
        // Create another session
        await userIdentity.run(async (ctx) => {
            await ctx.db.insert("session", {
                userId: userId,
                expiresAt: Date.now() + 1000000,
                token: "test-token-2",
                ipAddress: "127.0.0.1",
                userAgent: "test-agent",
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
        });

        const sessions = await userIdentity.query(api.sessions.getSessionsByUser, {});

        expect(sessions.length).toBeGreaterThanOrEqual(2);
        expect(sessions.every(s => s.userId === userId)).toBe(true);
    });

    test("getSessionsByUser rejects when unauthenticated", async () => {
        await expect(t.query(api.sessions.getSessionsByUser, {})).rejects.toThrow(
            /Unauthenticated|User not authenticated/
        );
    });

    test("invalidateSession updates session updatedAt", async () => {
        const initialSession = await userIdentity.run(async (ctx) => {
            return await ctx.db.get(sessionId);
        });

        await new Promise(resolve => setTimeout(resolve, 10));

        const result = await userIdentity.mutation(api.sessions.invalidateSession, {
            _id: sessionId,
        });

        expect(result?.message).toBe("Session invalidated");

        const updatedSession = await userIdentity.run(async (ctx) => {
            return await ctx.db.get(sessionId);
        });

        const initialUpdatedAt = initialSession?.updatedAt;
        const finalUpdatedAt = updatedSession?.updatedAt;
        if (initialUpdatedAt !== undefined && finalUpdatedAt !== undefined) {
            expect(finalUpdatedAt).toBeGreaterThan(initialUpdatedAt);
        }
    });
});
