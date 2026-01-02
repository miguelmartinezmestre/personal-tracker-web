import { describe, it, expect } from "vitest";
import { sessionSchema, savedSessionSchema } from "./session";

describe("sessionSchema", () => {
    it("should validate a valid session", () => {
        const validSession = {
            userId: 1,
            value: "session-token-123",
            status: "active",
        };

        const result = sessionSchema.safeParse(validSession);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.userId).toBe(1);
            expect(result.data.value).toBe("session-token-123");
            expect(result.data.status).toBe("active");
        }
    });

    it("should accept session with userAgent", () => {
        const validSession = {
            userId: 1,
            value: "session-token-123",
            status: "active",
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        };

        const result = sessionSchema.safeParse(validSession);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.userAgent).toBe("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
        }
    });

    it("should accept session with null userAgent", () => {
        const validSession = {
            userId: 1,
            value: "session-token-123",
            status: "active",
            userAgent: null,
        };

        const result = sessionSchema.safeParse(validSession);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.userAgent).toBeNull();
        }
    });

    it("should accept session without userAgent", () => {
        const validSession = {
            userId: 1,
            value: "session-token-123",
            status: "active",
        };

        const result = sessionSchema.safeParse(validSession);
        expect(result.success).toBe(true);
    });

    it("should require userId", () => {
        const invalidSession = {
            value: "session-token-123",
            status: "active",
        };

        const result = sessionSchema.safeParse(invalidSession);
        expect(result.success).toBe(false);
        if (!result.success) {
            const userIdError = result.error.issues.find(issue => issue.path.includes("userId"));
            expect(userIdError).toBeDefined();
        }
    });

    it("should require value", () => {
        const invalidSession = {
            userId: 1,
            status: "active",
        };

        const result = sessionSchema.safeParse(invalidSession);
        expect(result.success).toBe(false);
        if (!result.success) {
            const valueError = result.error.issues.find(issue => issue.path.includes("value"));
            expect(valueError).toBeDefined();
        }
    });

    it("should require status", () => {
        const invalidSession = {
            userId: 1,
            value: "session-token-123",
        };

        const result = sessionSchema.safeParse(invalidSession);
        expect(result.success).toBe(false);
        if (!result.success) {
            const statusError = result.error.issues.find(issue => issue.path.includes("status"));
            expect(statusError).toBeDefined();
        }
    });

    it("should validate userId as number", () => {
        const invalidSession = {
            userId: "not-a-number",
            value: "session-token-123",
            status: "active",
        };

        const result = sessionSchema.safeParse(invalidSession);
        expect(result.success).toBe(false);
    });
});

describe("savedSessionSchema", () => {
    it("should validate a saved session with _id", () => {
        const savedSession = {
            _id: "session-id-123",
            userId: 1,
            value: "session-token-123",
            status: "active",
        };

        const result = savedSessionSchema.safeParse(savedSession);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data._id).toBe("session-id-123");
        }
    });

    it("should require _id for saved session", () => {
        const invalidSavedSession = {
            userId: 1,
            value: "session-token-123",
            status: "active",
        };

        const result = savedSessionSchema.safeParse(invalidSavedSession);
        expect(result.success).toBe(false);
        if (!result.success) {
            const idError = result.error.issues.find(issue => issue.path.includes("_id"));
            expect(idError).toBeDefined();
        }
    });
});
