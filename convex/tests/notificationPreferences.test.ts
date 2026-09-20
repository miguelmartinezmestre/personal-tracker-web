import { beforeEach, describe, expect, test } from 'vitest';
import { api } from '../_generated/api';
import { initConvexTest } from './test.helper';
import { createTestMember, createTestOrganization, createTestUser } from './test_helpers';
import type { Id } from '../_generated/dataModel';

describe('convex notification preferences', () => {
    const t = initConvexTest();
    let userId: Id<'user'>;
    let userIdentity: ReturnType<typeof t.withIdentity>;

    beforeEach(async () => {
        const random = Math.random().toString(36).substring(2, 15);
        const user = await createTestUser(t, {
            userId: `preferences-user-${random}`,
            email: `preferences-${random}@example.com`,
            name: `Preferences User ${random}`,
            role: 'user',
        });
        userId = user.docId;

        const organizationId = await createTestOrganization(t, {
            name: `Preferences Org ${random}`,
            slug: `preferences-org-${random}`,
        });

        await createTestMember(t, {
            organizationId,
            userId,
            role: 'member',
        });

        userIdentity = t.withIdentity({
            subject: user.docId,
            userId: user.docId,
            email: user.email,
            name: user.name,
            role: user.role,
            emailVerified: true,
            createdAt: Date.now(),
            image: null,
            banExpires: null,
            banReason: null,
            banned: false,
        });
    });

    test('returns default preferences when no row exists', async () => {
        const preferences = await userIdentity.query(
            api.notificationPreferences.getUserPreferences,
            {}
        );

        expect(preferences).toEqual({
            achievementNotifications: true,
            deadlineNotifications: true,
            progressNotifications: true,
            organizationNotifications: true,
        });
    });

    test('creates preferences with defaults for omitted fields', async () => {
        await expect(
            userIdentity.mutation(api.notificationPreferences.updateUserPreferences, {
                deadlineNotifications: false,
            })
        ).resolves.toBeNull();

        const preferences = await userIdentity.query(
            api.notificationPreferences.getUserPreferences,
            {}
        );
        expect(preferences).toEqual({
            achievementNotifications: true,
            deadlineNotifications: false,
            progressNotifications: true,
            organizationNotifications: true,
        });
    });

    test('patches only provided fields and preserves explicit false values', async () => {
        await userIdentity.mutation(api.notificationPreferences.updateUserPreferences, {
            achievementNotifications: false,
            deadlineNotifications: false,
            progressNotifications: false,
            organizationNotifications: true,
        });

        await expect(
            userIdentity.mutation(api.notificationPreferences.updateUserPreferences, {
                organizationNotifications: false,
            })
        ).resolves.toBeNull();

        const preferences = await userIdentity.query(
            api.notificationPreferences.getUserPreferences,
            {}
        );
        expect(preferences).toEqual({
            achievementNotifications: false,
            deadlineNotifications: false,
            progressNotifications: false,
            organizationNotifications: false,
        });
    });
});
