import { describe, expect, it } from 'vitest';
import { organizationMemberSchema } from './organization-member';

describe('organizationMemberSchema', () => {
    it('accepts valid owner member payload', () => {
        const result = organizationMemberSchema.safeParse({
            email: 'owner@example.com',
            role: 'owner',
            organizationId: 'org_123',
        });

        expect(result.success).toBe(true);
    });

    it('rejects invalid role', () => {
        const result = organizationMemberSchema.safeParse({
            email: 'owner@example.com',
            role: 'super-admin',
            organizationId: 'org_123',
        });

        expect(result.success).toBe(false);
    });

    it('rejects invalid email', () => {
        const result = organizationMemberSchema.safeParse({
            email: 'invalid-email',
            role: 'member',
            organizationId: 'org_123',
        });

        expect(result.success).toBe(false);
    });
});
