import { beforeEach, describe, expect, test } from 'vitest';
import { api } from '../_generated/api';
import { initConvexTest } from './test.helper';
import { createTestUser, createTestOrganization, createTestMember } from './test_helpers';
import { TestConvexForDataModel } from 'convex-test';
import { DataModel } from '../_generated/dataModel';

describe('convex auth', () => {
    const t = initConvexTest();
    let userIdentity: TestConvexForDataModel<DataModel>;
    let userId: string;
    let _organizationId: string;

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

        // Get the actual Convex _id of the user document (needed for ctx.db.get)
        const userConvexId = await t.run(async ctx => {
            const userDoc = await ctx.db
                .query('user')
                .filter(q => q.eq(q.field('userId'), userId))
                .first();
            return userDoc?._id;
        });

        const orgId = await createTestOrganization(t, {
            name: 'Auth Org ' + randomSuffix,
            slug: 'auth-org-' + randomSuffix,
        });

        await createTestMember(t, {
            organizationId: String(orgId),
            userId: userId,
            role: 'owner',
        });

        _organizationId = String(orgId);

        userIdentity = t.withIdentity({
            subject: String(userConvexId),
            role: user.role,
            email: user.email,
            name: user.name,
            password: user.password,
            emailVerified: user.emailVerified,
            createdAt: Date.now(),
            userId: String(userConvexId),
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
