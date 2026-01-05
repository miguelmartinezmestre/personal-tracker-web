import { describe, it, expect } from 'vitest';
import { teamMemberSchema, savedTeamMemberSchema } from './team-member';

describe('teamMemberSchema', () => {
    it('should validate a valid team member', () => {
        const validMember = {
            email: 'member@example.com',
            role: 'MEMBER' as const,
            organizationId: 'org-123',
        };

        const result = teamMemberSchema.safeParse(validMember);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.email).toBe('member@example.com');
            expect(result.data.role).toBe('MEMBER');
            expect(result.data.organizationId).toBe('org-123');
        }
    });

    it('should validate a manager role', () => {
        const validManager = {
            email: 'manager@example.com',
            role: 'MANAGER' as const,
            organizationId: 'org-123',
        };

        const result = teamMemberSchema.safeParse(validManager);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.role).toBe('MANAGER');
        }
    });

    it('should reject invalid role', () => {
        const invalidMember = {
            email: 'member@example.com',
            role: 'ADMIN',
            organizationId: 'org-123',
        };

        const result = teamMemberSchema.safeParse(invalidMember);
        expect(result.success).toBe(false);
        if (!result.success) {
            const roleError = result.error.issues.find(issue => issue.path.includes('role'));
            expect(roleError).toBeDefined();
        }
    });

    it('should require email', () => {
        const invalidMember = {
            role: 'MEMBER',
            organizationId: 'org-123',
        };

        const result = teamMemberSchema.safeParse(invalidMember);
        expect(result.success).toBe(false);
        if (!result.success) {
            const emailError = result.error.issues.find(issue => issue.path.includes('email'));
            expect(emailError).toBeDefined();
        }
    });

    it('should validate email format', () => {
        const invalidMember = {
            email: 'not-an-email',
            role: 'MEMBER',
            organizationId: 'org-123',
        };

        const result = teamMemberSchema.safeParse(invalidMember);
        expect(result.success).toBe(false);
    });

    it('should require organizationId', () => {
        const invalidMember = {
            email: 'member@example.com',
            role: 'MEMBER',
        };

        const result = teamMemberSchema.safeParse(invalidMember);
        expect(result.success).toBe(false);
        if (!result.success) {
            const orgError = result.error.issues.find(issue =>
                issue.path.includes('organizationId')
            );
            expect(orgError).toBeDefined();
        }
    });
});

describe('savedTeamMemberSchema', () => {
    it('should validate a saved team member with all fields', () => {
        const savedMember = {
            id: 'member-id-123',
            createdAt: new Date(),
            email: 'member@example.com',
            userId: 'user-123',
            role: 'MEMBER' as const,
            organizationId: 'org-123',
        };

        const result = savedTeamMemberSchema.safeParse(savedMember);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.id).toBe('member-id-123');
            expect(result.data.userId).toBe('user-123');
        }
    });

    it('should require id for saved team member', () => {
        const invalidSavedMember = {
            createdAt: new Date(),
            email: 'member@example.com',
            userId: 'user-123',
            role: 'MEMBER',
            organizationId: 'org-123',
        };

        const result = savedTeamMemberSchema.safeParse(invalidSavedMember);
        expect(result.success).toBe(false);
    });

    it('should require createdAt for saved team member', () => {
        const invalidSavedMember = {
            id: 'member-id-123',
            email: 'member@example.com',
            userId: 'user-123',
            role: 'MEMBER',
            organizationId: 'org-123',
        };

        const result = savedTeamMemberSchema.safeParse(invalidSavedMember);
        expect(result.success).toBe(false);
    });
});
