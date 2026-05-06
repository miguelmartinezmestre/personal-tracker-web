import { beforeEach, describe, expect, test } from 'vitest';
import { api } from '../_generated/api';
import { initConvexTest } from './test.helper';
import { createTestMember, createTestOrganization, createTestUser } from './test_helpers';
import { Id } from '../_generated/dataModel';

describe('convex organizations', () => {
    const t = initConvexTest();
    let userIdentity: ReturnType<typeof t.withIdentity>;
    let organizationId: Id<'organization'>;
    let memberUserId: Id<'user'>;

    beforeEach(async () => {
        const randomSuffix = Math.random().toString(36).substring(2, 15);
        const user = {
            userId: 'test-user-organizations-' + randomSuffix,
            email: 'organizations-test@example.com-' + randomSuffix,
            name: 'Organizations Test User ' + randomSuffix,
            password: 'test-password',
            role: 'user',
            emailVerified: false,
        };

        const userData = await createTestUser(t, user);
        memberUserId = userData.docId;

        organizationId = await createTestOrganization(t, {
            name: 'Organizations Test Org ' + randomSuffix,
            slug: 'organizations-test-org-' + randomSuffix,
        });

        await createTestMember(t, {
            organizationId,
            userId: memberUserId,
            role: 'owner',
        });

        userIdentity = t.withIdentity({
            subject: userData.docId,
            role: user.role,
            email: user.email,
            name: user.name,
            password: user.password,
            emailVerified: user.emailVerified,
            createdAt: Date.now(),
            userId: userData.docId,
            image: 'https://example.com/image.png',
            banExpires: null,
            banReason: null,
            banned: false,
        });
    });

    test('getOrganizationMembers returns paginated members for authorized user', async () => {
        const result = await userIdentity.query(api.organizations.getOrganizationMembers, {
            organizationId,
            paginationOpts: { numItems: 20, cursor: null },
        });

        expect(Array.isArray(result.page)).toBe(true);
        expect(result.page.length).toBe(1);
        expect(result.page[0]?.userId).toBe(memberUserId);
        expect(result.isDone).toBe(true);
        expect(typeof result.continueCursor).toBe('string');
    });

    test('getOrganizationMembers rejects unauthenticated users', async () => {
        await expect(
            t.query(api.organizations.getOrganizationMembers, {
                organizationId,
                paginationOpts: { numItems: 20, cursor: null },
            })
        ).rejects.toThrow(/Unauthenticated|User not authenticated|AUTH_REQUIRED/);
    });
});
