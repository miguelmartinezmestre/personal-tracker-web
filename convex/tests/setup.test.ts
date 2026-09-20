import { describe, expect, test } from 'vitest';
import { api } from '../_generated/api';
import { initConvexTest } from './test.helper';
import {
    createTestUser,
    createTestOrganization,
    createTestMember,
    ensureTestUserAuth,
} from './test_helpers';
import { asInvalidArg } from './testCasts';
import { buildOrganizationSlug } from '../../shared/organization-slug';

describe('convex setup', () => {
    describe('isPlatformSetUp', () => {
        test('returns false when no platformSettings exist', async () => {
            const t = initConvexTest();
            const result = await t.query(api.setup.isPlatformSetUp, {});
            expect(result).toBe(false);
        });

        test('returns true when platformSettings exist', async () => {
            const t = initConvexTest();

            await t.run(async ctx => {
                const userId = await ctx.db.insert('user', {
                    name: 'Admin',
                    email: 'admin@test.com',
                    role: 'globalAdmin',
                    emailVerified: true,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    userId: 'test-user-1',
                    image: null,
                    banExpires: null,
                    banReason: null,
                    banned: false,
                });

                await ctx.db.insert('platformSettings', {
                    platformName: 'Test Platform',
                    defaultLanguage: 'en',
                    registrationPolicy: 'open',
                    setupCompletedBy: userId,
                });
            });

            const result = await t.query(api.setup.isPlatformSetUp, {});
            expect(result).toBe(true);
        });
    });

    describe('getPublicPlatformSettings', () => {
        test('returns null when no settings exist', async () => {
            const t = initConvexTest();
            const result = await t.query(api.setup.getPublicPlatformSettings, {});
            expect(result).toBeNull();
        });

        test('returns only public fields when settings exist', async () => {
            const t = initConvexTest();

            await t.run(async ctx => {
                const userId = await ctx.db.insert('user', {
                    name: 'Admin',
                    email: 'admin@test.com',
                    role: 'globalAdmin',
                    emailVerified: true,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    userId: 'test-user-1',
                    image: null,
                    banExpires: null,
                    banReason: null,
                    banned: false,
                });

                await ctx.db.insert('platformSettings', {
                    platformName: 'My Platform',
                    defaultLanguage: 'es',
                    registrationPolicy: 'invitation-only',
                    setupCompletedBy: userId,
                });
            });

            const result = await t.query(api.setup.getPublicPlatformSettings, {});
            expect(result).toEqual({
                platformName: 'My Platform',
                defaultLanguage: 'es',
                registrationPolicy: 'invitation-only',
            });
        });
    });

    describe('completeSetup', () => {
        test('creates a non-empty stable slug for an organization name without ASCII characters', async () => {
            const t = initConvexTest();
            const user = await createTestUser(t, {
                userId: 'setup-unicode-organization',
                email: 'setup-unicode-organization@test.com',
                name: 'Unicode Setup Admin',
            });
            const asUser = t.withIdentity({
                subject: user.docId,
                role: null,
                email: user.email,
                name: user.name,
                emailVerified: true,
                createdAt: Date.now(),
                userId: user.docId,
                image: null,
                banExpires: null,
                banReason: null,
                banned: false,
            });
            const organizationName = '组织目标甲乙丙';

            const result = await asUser.mutation(api.setup.completeSetup, {
                platformName: 'Unicode Platform',
                defaultLanguage: 'es',
                registrationPolicy: 'open',
                organizationName,
                categories: [],
            });

            const organization = await t.run(async ctx =>
                ctx.db.get('organization', result.organizationId)
            );
            expect(organization?.slug).toBe(buildOrganizationSlug(organizationName));
            expect(organization?.slug).toMatch(/^organization-[a-z0-9]+$/);
        });

        test('fails when platform is already configured', async () => {
            const t = initConvexTest();

            const userId = await t.run(async ctx => {
                const id = await ctx.db.insert('user', {
                    name: 'Admin',
                    email: 'admin@test.com',
                    role: null,
                    emailVerified: true,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    userId: 'test-user-1',
                    image: null,
                    banExpires: null,
                    banReason: null,
                    banned: false,
                });

                await ctx.db.insert('platformSettings', {
                    platformName: 'Existing',
                    defaultLanguage: 'en',
                    registrationPolicy: 'open',
                    setupCompletedBy: id,
                });

                return id;
            });

            const asUser = t.withIdentity({
                subject: userId,
                role: null,
                email: 'admin@test.com',
                name: 'Admin',
                emailVerified: true,
                createdAt: Date.now(),
                userId: userId,
                image: null,
                banExpires: null,
                banReason: null,
                banned: false,
            });

            await expect(
                asUser.mutation(api.setup.completeSetup, {
                    platformName: 'New Platform',
                    defaultLanguage: 'en',
                    registrationPolicy: 'open',
                    organizationName: 'New Org',
                    categories: [],
                })
            ).rejects.toThrow();
        });

        test('binds setup to the first user even when more than one account exists', async () => {
            const t = initConvexTest();

            const user1 = await createTestUser(t, {
                userId: 'user-1',
                email: 'user1@test.com',
                name: 'User 1',
            });

            const user2 = await createTestUser(t, {
                userId: 'user-2',
                email: 'user2@test.com',
                name: 'User 2',
            });

            const buildIdentity = (user: typeof user1) => ({
                subject: user.docId,
                role: user.role ?? null,
                email: user.email,
                name: user.name,
                emailVerified: true,
                createdAt: Date.now(),
                userId: user.docId,
                image: 'https://example.com/image.png',
                banExpires: null,
                banReason: null,
                banned: false,
            });

            const setupArgs = {
                platformName: 'Test Platform',
                defaultLanguage: 'en' as const,
                registrationPolicy: 'open' as const,
                organizationName: 'Test Org',
                categories: [],
            };

            // A later registrant cannot hijack the platform admin role.
            const asUser2 = t.withIdentity(buildIdentity(user2));
            await expect(asUser2.mutation(api.setup.completeSetup, setupArgs)).rejects.toThrow();

            // The first user can still complete setup despite the extra account
            // (previously this deadlocked with a "more than one user" error).
            const asUser1 = t.withIdentity(buildIdentity(user1));
            const result = await asUser1.mutation(api.setup.completeSetup, setupArgs);
            expect(typeof result.organizationId).toBe('string');
            await expect(
                t.run(ctx => ctx.db.get('organization', result.organizationId))
            ).resolves.not.toBeNull();
        });

        test('rejects invalid setup enum values at the backend boundary', async () => {
            const t = initConvexTest();

            const user = await createTestUser(t, {
                userId: 'setup-invalid-enums',
                email: 'setup-invalid-enums@test.com',
                name: 'Setup Invalid Enums',
            });

            const asUser = t.withIdentity({
                subject: user.docId,
                role: user.role ?? null,
                email: user.email,
                name: user.name,
                emailVerified: true,
                createdAt: Date.now(),
                userId: user.docId,
                image: null,
                banExpires: null,
                banReason: null,
                banned: false,
            });

            await expect(
                asUser.mutation(api.setup.completeSetup, {
                    platformName: 'Test Platform',
                    defaultLanguage: asInvalidArg<'en'>('fr'),
                    registrationPolicy: asInvalidArg<'open'>('closed'),
                    organizationName: 'Test Org',
                    categories: [],
                })
            ).rejects.toThrow();
        });

        test('succeeds with exactly one user and no existing settings', async () => {
            const t = initConvexTest();

            const user = await createTestUser(t, {
                userId: 'user-1',
                email: 'admin@test.com',
                name: 'Admin User',
            });

            const orgId = await createTestOrganization(t, {
                name: 'Personal Organization',
                slug: 'personal-org',
            });

            await createTestMember(t, {
                organizationId: orgId,
                userId: user.docId,
                role: 'owner',
            });

            const userIdentity = t.withIdentity({
                subject: user.docId,
                role: user.role ?? null,
                email: user.email,
                name: user.name,
                emailVerified: true,
                createdAt: Date.now(),
                userId: user.docId,
                image: 'https://example.com/image.png',
                banExpires: null,
                banReason: null,
                banned: false,
            });

            const result = await userIdentity.mutation(api.setup.completeSetup, {
                platformName: 'My Platform',
                defaultLanguage: 'es',
                registrationPolicy: 'invitation-only',
                organizationName: 'My Company',
                categories: [
                    { name: 'Health', color: '#EF4444', icon: 'heart' },
                    { name: 'Career', color: '#3B82F6', icon: 'briefcase' },
                ],
            });

            expect(typeof result.organizationId).toBe('string');

            const updatedUser = await t.run(async ctx => {
                return await ctx.db.get('user', user.docId);
            });
            expect(updatedUser?.role).toBe('globalAdmin');

            const organization = await t.run(async ctx => {
                return await ctx.db.get('organization', result.organizationId);
            });
            expect(organization?.name).toBe('My Company');

            const categories = await t.run(async ctx => {
                return await ctx.db.query('categories').collect();
            });
            expect(categories).toHaveLength(2);
            expect(categories.map(category => category.name)).toContain('Health');
            expect(categories.map(category => category.name)).toContain('Career');

            const settings = await t.run(async ctx => {
                return await ctx.db.query('platformSettings').first();
            });
            expect(settings?.platformName).toBe('My Platform');
            expect(settings?.defaultLanguage).toBe('es');
            expect(settings?.registrationPolicy).toBe('invitation-only');
            expect(settings?.setupCompletedBy).toBe(user.docId);

            const achievementProgress = await userIdentity.query(
                api.achievements.getUserAchievementProgress,
                {}
            );
            expect(achievementProgress.length).toBeGreaterThan(0);
        });

        test('creates a team organization without converting the protected personal one', async () => {
            const t = initConvexTest();
            const user = await createTestUser(t, {
                userId: 'setup-personal-workspace-user',
                email: 'personal-setup@example.com',
                name: 'Personal Setup Admin',
            });
            const personalOrganizationId = await createTestOrganization(t, {
                name: 'Personal Organization',
                slug: 'personal-workspace',
                description: JSON.stringify({ type: 'personal', ownerUserId: user.docId }),
            });
            await createTestMember(t, {
                organizationId: personalOrganizationId,
                userId: user.docId,
                role: 'owner',
            });

            const userIdentity = t.withIdentity({
                subject: user.docId,
                userId: user.docId,
                email: user.email,
                name: user.name,
                role: null,
                emailVerified: true,
                createdAt: Date.now(),
                image: null,
                banExpires: null,
                banReason: null,
                banned: false,
            });

            const result = await userIdentity.mutation(api.setup.completeSetup, {
                platformName: 'Separated workspaces',
                defaultLanguage: 'en',
                registrationPolicy: 'open',
                organizationName: 'Real Team',
                categories: [],
            });

            expect(result.organizationId).not.toBe(personalOrganizationId);
            await t.run(async ctx => {
                const personal = await ctx.db.get('organization', personalOrganizationId);
                const team = await ctx.db.get('organization', result.organizationId);
                const memberships = await ctx.db
                    .query('member')
                    .withIndex('userId', q => q.eq('userId', user.docId))
                    .collect();
                const session = await ctx.db
                    .query('session')
                    .withIndex('userId', q => q.eq('userId', user.docId))
                    .first();

                expect(personal?.name).toBe('Personal Organization');
                expect(personal?.metadata).toBe(
                    JSON.stringify({ type: 'personal', ownerUserId: user.docId })
                );
                expect(team?.name).toBe('Real Team');
                expect(team?.metadata).toBeNull();
                expect(memberships.map(membership => membership.organizationId)).toEqual(
                    expect.arrayContaining([personalOrganizationId, result.organizationId])
                );
                expect(session?.activeOrganizationId).toBe(result.organizationId);
            });
        });
    });

    describe('isPlatformSetupUser queries', () => {
        test('isCurrentUserPlatformSetupUser returns true for setup user', async () => {
            const t = initConvexTest();

            const setupUserId = await t.run(async ctx => {
                const userId = await ctx.db.insert('user', {
                    name: 'Setup Admin',
                    email: 'setup-admin@test.com',
                    role: 'globalAdmin',
                    emailVerified: true,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    userId: 'setup-admin-user',
                    image: null,
                    banExpires: null,
                    banReason: null,
                    banned: false,
                });

                await ctx.db.insert('platformSettings', {
                    platformName: 'Test Platform',
                    defaultLanguage: 'en',
                    registrationPolicy: 'open',
                    setupCompletedBy: userId,
                });

                return userId;
            });

            await ensureTestUserAuth(t, setupUserId, {
                organizationName: 'Setup Admin Org',
                role: 'owner',
            });

            const userIdentity = t.withIdentity({
                subject: setupUserId,
                userId: setupUserId,
                email: 'setup-admin@test.com',
                name: 'Setup Admin',
                role: 'globalAdmin',
                emailVerified: true,
                createdAt: Date.now(),
                image: null,
                banExpires: null,
                banReason: null,
                banned: false,
            });

            const isSetupUser = await userIdentity.query(
                api.setup.isCurrentUserPlatformSetupUser,
                {}
            );
            expect(isSetupUser).toBe(true);

            const setupUserIdFromQuery = await userIdentity.query(
                api.setup.getPlatformSetupUserId,
                {}
            );
            expect(setupUserIdFromQuery).toBe(setupUserId);
        });

        test('isCurrentUserPlatformSetupUser returns false for other users', async () => {
            const t = initConvexTest();

            const otherUserId = await t.run(async ctx => {
                const setupUserId = await ctx.db.insert('user', {
                    name: 'Setup Admin',
                    email: 'setup-admin@test.com',
                    role: 'globalAdmin',
                    emailVerified: true,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    userId: 'setup-admin-user',
                    image: null,
                    banExpires: null,
                    banReason: null,
                    banned: false,
                });

                const regularUserId = await ctx.db.insert('user', {
                    name: 'Regular User',
                    email: 'regular-user@test.com',
                    role: 'user',
                    emailVerified: true,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    userId: 'regular-user',
                    image: null,
                    banExpires: null,
                    banReason: null,
                    banned: false,
                });

                await ctx.db.insert('platformSettings', {
                    platformName: 'Test Platform',
                    defaultLanguage: 'en',
                    registrationPolicy: 'open',
                    setupCompletedBy: setupUserId,
                });

                return regularUserId;
            });

            const userIdentity = t.withIdentity({
                subject: otherUserId,
                userId: otherUserId,
                email: 'regular-user@test.com',
                name: 'Regular User',
                role: 'user',
                emailVerified: true,
                createdAt: Date.now(),
                image: null,
                banExpires: null,
                banReason: null,
                banned: false,
            });

            const isSetupUser = await userIdentity.query(
                api.setup.isCurrentUserPlatformSetupUser,
                {}
            );
            expect(isSetupUser).toBe(false);
        });
    });
});
