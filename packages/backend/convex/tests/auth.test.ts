import { beforeEach, describe, expect, test } from 'vitest';
import { api } from '../_generated/api';
import { initConvexTest } from '../../better-auth.helper';
import { createTestUser, createTestOrganization, createTestMember } from '../../test_helpers';
import { TestConvexForDataModel } from 'convex-test';
import { DataModel } from '../_generated/dataModel';

describe('convex auth', () => {
    const t = initConvexTest();
    let userIdentity: TestConvexForDataModel<DataModel>;
    let userId: string;
    let organizationId: string;

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

        await createTestUser(t, {
            userId: user.userId,
            email: user.email,
            name: user.name,
            password: 'test-password',
            role: 'admin',
            emailVerified: false,
        });
        userId = user.userId;

        const orgId = await createTestOrganization(t, {
            name: 'Auth Org ' + randomSuffix,
            slug: 'auth-org-' + randomSuffix,
        });

        await createTestMember(t, {
            organizationId: String(orgId),
            userId: userId,
            role: 'owner',
        });

        organizationId = String(orgId);

        userIdentity = t.withIdentity({
            subject: user.userId,
            role: user.role,
            email: user.email,
            name: user.name,
            password: user.password,
            emailVerified: user.emailVerified,
            createdAt: Date.now(),
            userId: user.userId,
            image: 'https://example.com/image.png',
            banExpires: null,
            banReason: null,
            banned: false,
        });
    });

    test('getCurrentUser returns null when unauthenticated', async () => {
        const current = await t.query(api.auth.getCurrentUser, {});
        expect(current).toBeNull();
    });

    test('getCurrentUser returns user when authenticated', async () => {
        const current = await userIdentity.query(api.auth.getCurrentUser, {});
        expect(current).not.toBeNull();
        expect(current?.subject).toBeDefined();
    });
});
