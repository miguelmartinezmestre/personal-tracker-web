import { beforeEach, describe, expect, test } from 'vitest';
import { api } from '../_generated/api';
import { initConvexTest } from './test.helper';
import { createTestUser, createTestOrganization, createTestMember } from './test_helpers';
import { TestConvexForDataModel } from 'convex-test';
import { DataModel, Id } from '../_generated/dataModel';

describe('convex auth', () => {
    const t = initConvexTest();
    let userIdentity: TestConvexForDataModel<DataModel>;
    let userId: Id<'user'>;
    let _organizationId: Id<'organization'>;

    beforeEach(async () => {
        const randomSuffix = Math.random().toString(36).substring(2, 15);

        const user = {
            userId: 'test-user-123-' + randomSuffix,
            email: 'test@example.com-' + randomSuffix,
            name: 'Test User ' + randomSuffix,
            password: 'test-password',
            role: 'admin',
            emailVerified: false,
        };

        const userData = await createTestUser(t, {
            userId: user.userId,
            email: user.email,
            name: user.name,
            password: 'test-password',
            role: 'admin',
            emailVerified: false,
        });
        userId = userData.docId;

        const orgId = await createTestOrganization(t, {
            name: 'Auth Org ' + randomSuffix,
            slug: 'auth-org-' + randomSuffix,
        });

        await createTestMember(t, {
            organizationId: orgId,
            userId,
            role: 'owner',
        });

        _organizationId = orgId;

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

    test('getCurrentUser throws when unauthenticated', async () => {
        await expect(t.query(api.auth.getCurrentUser, {})).rejects.toThrow(/Unauthenticated/);
    });

    test('getCurrentUser returns user when authenticated', async () => {
        const current = await userIdentity.query(api.auth.getCurrentUser, {});
        expect(current).not.toBeNull();
        expect(current?.name).toBeDefined();
    });
});
