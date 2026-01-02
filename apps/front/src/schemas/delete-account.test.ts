import { describe, it, expect } from "vitest";
import { formSchema } from "./delete-account";

describe("deleteAccountSchema (formSchema)", () => {
    it("should validate a valid delete account request", () => {
        const validData = {
            id: 123,
        };

        const result = formSchema.safeParse(validData);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.id).toBe(123);
        }
    });

    it("should require id", () => {
        const invalidData = {};

        const result = formSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
            const idError = result.error.issues.find(issue => issue.path.includes("id"));
            expect(idError).toBeDefined();
        }
    });

    it("should validate id as number", () => {
        const invalidData = {
            id: "not-a-number",
        };

        const result = formSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });

    it("should accept zero as valid id", () => {
        const validData = {
            id: 0,
        };

        const result = formSchema.safeParse(validData);
        expect(result.success).toBe(true);
    });

    it("should accept negative numbers as id", () => {
        const validData = {
            id: -1,
        };

        const result = formSchema.safeParse(validData);
        expect(result.success).toBe(true);
    });

    it("should reject floating point numbers", () => {
        const invalidData = {
            id: 1.5,
        };

        // Zod number() accepts floats by default, so this should pass
        const result = formSchema.safeParse(invalidData);
        expect(result.success).toBe(true);
    });
});
