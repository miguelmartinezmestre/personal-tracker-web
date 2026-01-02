import { describe, it, expect } from "vitest";
import { resetPasswordSchema } from "./reset-password";

describe("resetPasswordSchema", () => {
    it("should validate valid reset password data", () => {
        const validData = {
            password: "newpassword123",
            confirmPassword: "newpassword123",
            resetPasswordKey: "abc123key",
        };

        const result = resetPasswordSchema.safeParse(validData);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.password).toBe("newpassword123");
            expect(result.data.confirmPassword).toBe("newpassword123");
            expect(result.data.resetPasswordKey).toBe("abc123key");
        }
    });

    it("should require password", () => {
        const invalidData = {
            confirmPassword: "password123",
            resetPasswordKey: "abc123",
        };

        const result = resetPasswordSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
            const passwordError = result.error.issues.find(issue => issue.path.includes("password"));
            expect(passwordError).toBeDefined();
        }
    });

    it("should require confirmPassword", () => {
        const invalidData = {
            password: "password123",
            resetPasswordKey: "abc123",
        };

        const result = resetPasswordSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
            const confirmError = result.error.issues.find(issue => issue.path.includes("confirmPassword"));
            expect(confirmError).toBeDefined();
        }
    });

    it("should require resetPasswordKey", () => {
        const invalidData = {
            password: "password123",
            confirmPassword: "password123",
        };

        const result = resetPasswordSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
            const keyError = result.error.issues.find(issue => issue.path.includes("resetPasswordKey"));
            expect(keyError).toBeDefined();
        }
    });

    it("should require password to be at least 8 characters", () => {
        const invalidData = {
            password: "short",
            confirmPassword: "short",
            resetPasswordKey: "abc123",
        };

        const result = resetPasswordSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });

    it("should fail when passwords do not match", () => {
        const invalidData = {
            password: "password123",
            confirmPassword: "differentpassword",
            resetPasswordKey: "abc123",
        };

        const result = resetPasswordSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
            const mismatchError = result.error.issues.find(
                issue => issue.message === "Las contraseñas no coinciden"
            );
            expect(mismatchError).toBeDefined();
        }
    });

    it("should accept password with exactly 8 characters", () => {
        const validData = {
            password: "12345678",
            confirmPassword: "12345678",
            resetPasswordKey: "key",
        };

        const result = resetPasswordSchema.safeParse(validData);
        expect(result.success).toBe(true);
    });

    it("should require resetPasswordKey to be at least 1 character", () => {
        const invalidData = {
            password: "password123",
            confirmPassword: "password123",
            resetPasswordKey: "",
        };

        const result = resetPasswordSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });
});
