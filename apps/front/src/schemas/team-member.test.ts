import { describe, it, expect } from "vitest";
import { teamMemberSchema, savedTeamMemberSchema } from "./team-member";

describe("teamMemberSchema", () => {
    it("should validate a valid team member", () => {
        const validMember = {
            email: "member@example.com",
            userId: "user-123",
            role: "MEMBER" as const,
            organizationId: "org-123",
        };

        const result = teamMemberSchema.safeParse(validMember);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.email).toBe("member@example.com");
            expect(result.data.userId).toBe("user-123");
            expect(result.data.role).toBe("MEMBER");
            expect(result.data.organizationId).toBe("org-123");
        }
    });

    it("should validate a manager role", () => {
        const validManager = {
            email: "manager@example.com",
            userId: "user-456",
            role: "MANAGER" as const,
            organizationId: "org-123",
        };

        const result = teamMemberSchema.safeParse(validManager);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.role).toBe("MANAGER");
        }
    });

    it("should reject invalid role", () => {
        const invalidMember = {
            email: "member@example.com",
            userId: "user-123",
            role: "ADMIN",
            organizationId: "org-123",
        };

        const result = teamMemberSchema.safeParse(invalidMember);
        expect(result.success).toBe(false);
        if (!result.success) {
            const roleError = result.error.issues.find(issue => issue.path.includes("role"));
            expect(roleError).toBeDefined();
        }
    });

    it("should require email", () => {
        const invalidMember = {
            userId: "user-123",
            role: "MEMBER",
            organizationId: "org-123",
        };

        const result = teamMemberSchema.safeParse(invalidMember);
        expect(result.success).toBe(false);
        if (!result.success) {
            const emailError = result.error.issues.find(issue => issue.path.includes("email"));
            expect(emailError).toBeDefined();
        }
    });

    it("should validate email format", () => {
        const invalidMember = {
            email: "not-an-email",
            userId: "user-123",
            role: "MEMBER",
            organizationId: "org-123",
        };

        const result = teamMemberSchema.safeParse(invalidMember);
        expect(result.success).toBe(false);
    });

    it("should require userId", () => {
        const invalidMember = {
            email: "member@example.com",
            role: "MEMBER",
            organizationId: "org-123",
        };

        const result = teamMemberSchema.safeParse(invalidMember);
        expect(result.success).toBe(false);
        if (!result.success) {
            const userIdError = result.error.issues.find(issue => issue.path.includes("userId"));
            expect(userIdError).toBeDefined();
        }
    });

    it("should require organizationId", () => {
        const invalidMember = {
            email: "member@example.com",
            userId: "user-123",
            role: "MEMBER",
        };

        const result = teamMemberSchema.safeParse(invalidMember);
        expect(result.success).toBe(false);
        if (!result.success) {
            const orgError = result.error.issues.find(issue => issue.path.includes("organizationId"));
            expect(orgError).toBeDefined();
        }
    });
});

describe("savedTeamMemberSchema", () => {
    it("should validate a saved team member with all fields", () => {
        const savedMember = {
            _id: "member-id-123" as any,
            _creationTime: 1699999999999,
            createdAt: 1699999999999,
            email: "member@example.com",
            userId: "user-123",
            role: "MEMBER" as const,
            organizationId: "org-123",
        };

        const result = savedTeamMemberSchema.safeParse(savedMember);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data._id).toBe("member-id-123");
            expect(result.data._creationTime).toBe(1699999999999);
            expect(result.data.createdAt).toBe(1699999999999);
        }
    });

    it("should include _id in saved team member", () => {
        // Note: z.custom allows any value, so we test that the field is used
        const savedMember = {
            _id: "member-id-123" as any,
            _creationTime: 1699999999999,
            createdAt: 1699999999999,
            email: "member@example.com",
            userId: "user-123",
            role: "MEMBER" as const,
            organizationId: "org-123",
        };

        const result = savedTeamMemberSchema.safeParse(savedMember);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data._id).toBe("member-id-123");
        }
    });

    it("should require _creationTime for saved team member", () => {
        const invalidSavedMember = {
            _id: "member-id-123",
            createdAt: 1699999999999,
            email: "member@example.com",
            userId: "user-123",
            role: "MEMBER",
            organizationId: "org-123",
        };

        const result = savedTeamMemberSchema.safeParse(invalidSavedMember);
        expect(result.success).toBe(false);
    });

    it("should require createdAt for saved team member", () => {
        const invalidSavedMember = {
            _id: "member-id-123",
            _creationTime: 1699999999999,
            email: "member@example.com",
            userId: "user-123",
            role: "MEMBER",
            organizationId: "org-123",
        };

        const result = savedTeamMemberSchema.safeParse(invalidSavedMember);
        expect(result.success).toBe(false);
    });
});
