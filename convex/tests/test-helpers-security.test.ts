import { describe, expect, test } from 'vitest';
import { internal } from '../_generated/api';
import { convexTest } from 'convex-test';
import schema from '../schema';
import { modules } from './test.setup';
import { createTestUser } from './test_helpers';

describe('test helpers security', () => {
    describe('ensureTestOrganizationInternal', () => {
        test('can be called directly in test environment without authentication', async () => {
            const t = convexTest(schema, modules);

            const user = await createTestUser(t, {
                userId: 'test-user-security',
                email: 'security-test@example.com',
                name: 'Security Test User',
                role: 'globalAdmin',
            });

            const result = await t.mutation(internal.setup.ensureTestOrganizationInternal, {
                userId: user.docId,
                organizationName: 'Security Test Org',
                createPersonalCategory: true,
            });

            expect(result.organizationId).toBeDefined();
            expect(result.memberId).toBeDefined();
        });

        test('non-admin user can still have organization created via internal', async () => {
            const t = convexTest(schema, modules);

            const user = await createTestUser(t, {
                userId: 'regular-user',
                email: 'regular@example.com',
                name: 'Regular User',
                role: 'user',
            });

            const result = await t.mutation(internal.setup.ensureTestOrganizationInternal, {
                userId: user.docId,
                organizationName: 'Regular User Org',
            });

            expect(result.organizationId).toBeDefined();
        });
    });

    describe('seedAchievementDefinitionsInternal', () => {
        test('can be called directly in test environment without authentication', async () => {
            const t = convexTest(schema, modules);

            const result = await t.mutation(
                internal.achievements.seedAchievementDefinitionsInternal,
                {}
            );

            expect(result.count).toBeGreaterThan(0);
            expect(result.message).toBe('Achievements seeded successfully');
        });

        test('does not duplicate on multiple calls', async () => {
            const t = convexTest(schema, modules);

            await t.mutation(internal.achievements.seedAchievementDefinitionsInternal, {});
            const secondResult = await t.mutation(
                internal.achievements.seedAchievementDefinitionsInternal,
                {}
            );

            expect(secondResult.count).toBe(0);
            expect(secondResult.message).toBe('Achievements already seeded');
        });
    });

    describe('requireAdminInternal', () => {
        test('returns user when user is admin', async () => {
            const t = convexTest(schema, modules);

            const admin = await createTestUser(t, {
                userId: 'admin-user',
                email: 'admin@example.com',
                name: 'Admin User',
                role: 'globalAdmin',
            });

            const result = await t.query(internal.setup.requireAdminInternal, {
                userId: admin.docId,
            });

            expect(result).toBeDefined();
            expect(result.role).toBe('globalAdmin');
        });

        test('throws FORBIDDEN when user is not admin', async () => {
            const t = convexTest(schema, modules);

            const user = await createTestUser(t, {
                userId: 'non-admin-user',
                email: 'user@example.com',
                name: 'Regular User',
                role: 'user',
            });

            await expect(
                t.query(internal.setup.requireAdminInternal, {
                    userId: user.docId,
                })
            ).rejects.toThrow(/FORBIDDEN/);
        });

        test('throws error when user does not exist', async () => {
            const t = convexTest(schema, modules);

            const user = await createTestUser(t, {
                userId: 'temp-admin-user',
                email: 'temp@example.com',
                name: 'Temp User',
                role: 'globalAdmin',
            });
            const userId = user.docId;

            await t.run(async ctx => {
                await ctx.db.delete(userId);
            });

            await expect(
                t.query(internal.setup.requireAdminInternal, {
                    userId,
                })
            ).rejects.toThrow(/FORBIDDEN/);
        });
    });
});
