import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

describe("convex auth", () => {
    test("getCurrentUser returns null when unauthenticated", async () => {
        const t = convexTest(schema, modules);
        const current = await t.query(api.auth.getCurrentUser, {});
        expect(current).toBeNull();
    });
});


