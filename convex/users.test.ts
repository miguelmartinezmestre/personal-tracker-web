import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

describe("convex users", () => {
    test("getAccountDetails unauthorized", async () => {
        const t = convexTest(schema, modules);
        await expect(t.query(api.users.getAccountDetails, {})).rejects.toThrow("Unauthorized");
    });

    test("updateAccountDetails unauthorized", async () => {
        const t = convexTest(schema, modules);
        await expect(
            t.mutation(api.users.updateAccountDetails, { email: "a@b.com", username: "abc" })
        ).rejects.toThrow("Unauthorized");
    });

    test("getUser returns null without identity", async () => {
        const t = convexTest(schema, modules);
        const user = await t.query(api.users.getUser, {});
        expect(user).toBeNull();
    });

    test("setRole unauthorized without identity", async () => {
        const t = convexTest(schema, modules);
        await expect(t.mutation(api.users.setRole, {} as any)).rejects.toThrow("User not authenticated");
    });
});


