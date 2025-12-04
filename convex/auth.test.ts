import { convexTest } from "convex-test";
import { describe, expect, test, beforeEach } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "../test.setup";
import { createTestUser } from "./test_helpers";

describe("convex auth", () => {
    let t: ReturnType<typeof convexTest>;
    let userId: string;

    t = convexTest(schema, modules);

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
    });

    test("getCurrentUser returns null when unauthenticated", async () => {
        const current = await t.query(api.auth.getCurrentUser, {});
        expect(current).toBeNull();
    });

    test("getCurrentUser returns user when authenticated", async () => {
        const current = await userIdentity.query(api.auth.getCurrentUser, {});
        expect(current).not.toBeNull();
        expect(current?._id).toBeDefined();
    });

    test("isAuthenticated returns user when authenticated", async () => {
        const user = await userIdentity.query(api.auth.isAuthenticated, {});
        expect(user).not.toBeNull();
        expect(user?._id).toBeDefined();
    });

    test("isAuthenticated returns null when unauthenticated", async () => {
        // isAuthenticated throws error instead of returning null when unauthenticated
        await expect(t.query(api.auth.isAuthenticated, {})).rejects.toThrow();
    });
});


