import { describe, expect, test } from 'vitest';
import { api } from '../_generated/api';
import { initConvexTest } from './test.helper';
import { createTestUser, createTestOrganization, createTestMember } from './test.helpers';
import { ERROR_CODES } from '../shared/errorCodes';

describe('convex setup', () => {
    describe('getPublicPlatformSettings', () => {
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
            ).rejects.toThrow(ERROR_CODES.PLATFORM_ALREADY_CONFIGURED);
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

            const asUser2 = t.withIdentity(buildIdentity(user2));
            await expect(asUser2.mutation(api.setup.completeSetup, setupArgs)).rejects.toThrow(
                ERROR_CODES.SETUP_USER_MISMATCH
            );

            const asUser1 = t.withIdentity(buildIdentity(user1));
            const result = await asUser1.mutation(api.setup.completeSetup, setupArgs);
            await expect(
                t.run(ctx => ctx.db.get('organization', result.organizationId))
            ).resolves.not.toBeNull();
        });

        test.each([
            ['a blank platform name', { platformName: '   ' }],
            ['a category without a hex color', { categories: [{ name: 'Health', color: 'red' }] }],
        ])('rejects %s without configuring the platform', async (_label, override) => {
            const t = initConvexTest();

            const user = await createTestUser(t, {
                userId: 'setup-invalid-args',
                email: 'setup-invalid-args@test.com',
                name: 'Setup Invalid Args',
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
                    defaultLanguage: 'en',
                    registrationPolicy: 'open',
                    organizationName: 'Test Org',
                    categories: [],
                    ...override,
                })
            ).rejects.toThrow(ERROR_CODES.VALIDATION_ERROR);
            await expect(t.query(api.setup.isPlatformSetUp, {})).resolves.toBe(false);
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

            const updatedUser = await t.run(async ctx => {
                return await ctx.db.get('user', user.docId);
            });

            expect(updatedUser?.role).toBe('globalAdmin');

            // The existing non-personal organization is renamed, not replaced.
            expect(result.organizationId).toBe(orgId);

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
});
