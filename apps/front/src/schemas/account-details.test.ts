import { describe, it, expect } from "vitest";
import { accountDetailsSchema } from "./account-details";

describe("accountDetailsSchema", () => {
    it("should validate valid account details", () => {
        const validDetails = {
            email: "test@example.com",
            username: "testuser",
        };

        const result = accountDetailsSchema.safeParse(validDetails);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.email).toBe("test@example.com");
            expect(result.data.username).toBe("testuser");
        }
    });

    it("should require email", () => {
        const invalidDetails = {
            username: "testuser",
        };

        const result = accountDetailsSchema.safeParse(invalidDetails);
        expect(result.success).toBe(false);
        if (!result.success) {
            const emailError = result.error.issues.find(issue => issue.path.includes("email"));
            expect(emailError).toBeDefined();
        }
    });

    it("should require username", () => {
        const invalidDetails = {
            email: "test@example.com",
        };

        const result = accountDetailsSchema.safeParse(invalidDetails);
        expect(result.success).toBe(false);
        if (!result.success) {
            const usernameError = result.error.issues.find(issue => issue.path.includes("username"));
            expect(usernameError).toBeDefined();
        }
    });

    it("should validate email format", () => {
        const invalidDetails = {
            email: "not-an-email",
            username: "testuser",
        };

        const result = accountDetailsSchema.safeParse(invalidDetails);
        expect(result.success).toBe(false);
    });

    it("should require username to be at least 3 characters", () => {
        const invalidDetails = {
            email: "test@example.com",
            username: "ab",
        };

        const result = accountDetailsSchema.safeParse(invalidDetails);
        expect(result.success).toBe(false);
        if (!result.success) {
            const usernameError = result.error.issues.find(issue => issue.path.includes("username"));
            expect(usernameError).toBeDefined();
        }
    });

    it("should accept username with exactly 3 characters", () => {
        const validDetails = {
            email: "test@example.com",
            username: "abc",
        };

        const result = accountDetailsSchema.safeParse(validDetails);
        expect(result.success).toBe(true);
    });

    it("should accept various valid email formats", () => {
        const validEmails = [
            "test@example.com",
            "user.name@example.co.uk",
            "user+tag@example.com",
            "user123@test.org",
        ];

        validEmails.forEach((email) => {
            const result = accountDetailsSchema.safeParse({
                email,
                username: "testuser",
            });
            expect(result.success).toBe(true);
        });
    });
});
