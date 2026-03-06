import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';
import { api } from '../_generated/api';
import schema from '../schema';
import { modules } from './test.setup';
import { createTestUser, createTestOrganization, createTestMember } from './test_helpers';
import type { Id } from '../_generated/dataModel';

describe('convex setup', () => {
    describe('isPlatformSetUp', () => {
        test('returns false when no platformSettings exist', async () => {
            const t = convexTest(schema, modules);
            const result = await t.query(api.setup.isPlatformSetUp, {});
            expect(result).toBe(false);
        });

        test('returns true when platformSettings exist', async () => {
            const t = convexTest(schema, modules);

            // Manually insert a platformSettings record
            await t.run(async ctx => {
                const userId = await ctx.db.insert('user', {
                    name: 'Admin',
                    email: 'admin@test.com',
                    role: 'admin',
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
                    setupCompletedAt: Date.now(),
                    setupCompletedBy: userId,
                });
            });

            const result = await t.query(api.setup.isPlatformSetUp, {});
            expect(result).toBe(true);
        });
    });

    describe('getPublicPlatformSettings', () => {
        test('returns null when no settings exist', async () => {
            const t = convexTest(schema, modules);
            const result = await t.query(api.setup.getPublicPlatformSettings, {});
            expect(result).toBeNull();
        });

        test('returns only public fields when settings exist', async () => {
            const t = convexTest(schema, modules);

            await t.run(async ctx => {
                const userId = await ctx.db.insert('user', {
                    name: 'Admin',
                    email: 'admin@test.com',
                    role: 'admin',
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
                    setupCompletedAt: Date.now(),
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
            const t = convexTest(schema, modules);

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
                    setupCompletedAt: Date.now(),
                    setupCompletedBy: id,
                });

                return id;
            });

            await expect(
                t.mutation(
                    api.setup.completeSetup,
                    {
                        platformName: 'New Platform',
                        defaultLanguage: 'en',
                        registrationPolicy: 'open',
                        organizationName: 'New Org',
                        categories: [],
                    },
                    { identity: { subject: userId, tokenIdentifier: `test|${userId}` } }
                )
            ).rejects.toThrow();
        });

        test('fails when more than one user exists', async () => {
            const t = convexTest(schema, modules);

            const user1 = await createTestUser(t, {
                userId: 'user-1',
                email: 'user1@test.com',
                name: 'User 1',
            });

            await createTestUser(t, {
                userId: 'user-2',
                email: 'user2@test.com',
                name: 'User 2',
            });

            await expect(
                t.mutation(
                    api.setup.completeSetup,
                    {
                        platformName: 'Test Platform',
                        defaultLanguage: 'en',
                        registrationPolicy: 'open',
                        organizationName: 'Test Org',
                        categories: [],
                    },
                    {
                        identity: {
                            subject: user1.docId,
                            tokenIdentifier: `test|${user1.docId}`,
                        },
                    }
                )
            ).rejects.toThrow();
        });

        test('succeeds with exactly one user and no existing settings', async () => {
            const t = convexTest(schema, modules);

            const user = await createTestUser(t, {
                userId: 'user-1',
                email: 'admin@test.com',
                name: 'Admin User',
            });

            // Create org + membership (simulating what the session hook does)
            const orgId = await createTestOrganization(t, {
                name: 'Personal Organization',
                slug: 'personal-org',
            });

            await createTestMember(t, {
                organizationId: orgId,
                userId: user.docId,
                role: 'owner',
            });

            // Use withIdentity to simulate auth for better-convex/auth's getAuthUserIdentity
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

            expect(result.success).toBe(true);
            expect(result.organizationId).toBeDefined();

            // Verify user was promoted to admin
            const updatedUser = await t.run(async ctx => {
                return await ctx.db.get(user.docId);
            });
            expect(updatedUser?.role).toBe('admin');

            // Verify organization was renamed
            const org = await t.run(async ctx => {
                return await ctx.db.get(result.organizationId as Id<'organization'>);
            });
            expect(org?.name).toBe('My Company');

            // Verify categories were created
            const categories = await t.run(async ctx => {
                return await ctx.db.query('categories').collect();
            });
            expect(categories).toHaveLength(2);
            expect(categories.map(c => c.name)).toContain('Health');
            expect(categories.map(c => c.name)).toContain('Career');

            // Verify platformSettings was inserted
            const settings = await t.run(async ctx => {
                return await ctx.db.query('platformSettings').first();
            });
            expect(settings?.platformName).toBe('My Platform');
            expect(settings?.defaultLanguage).toBe('es');
            expect(settings?.registrationPolicy).toBe('invitation-only');
            expect(settings?.setupCompletedBy).toBe(user.docId);
        });
    });
});
