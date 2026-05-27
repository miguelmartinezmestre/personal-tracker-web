import { beforeEach, describe, expect, test } from 'vitest';
import { api } from '../_generated/api';
import { initConvexTest } from './test.helper';
import { createTestUser, createTestOrganization, createTestMember } from './test_helpers';
import { TestConvexForDataModel } from 'convex-test';
import { DataModel, Id } from '../_generated/dataModel';

describe('convex categories', async () => {
    const t = initConvexTest();
    let userIdentity: TestConvexForDataModel<DataModel>;
    let adminIdentity: TestConvexForDataModel<DataModel>;
    let userId: Id<'user'>;
    let userOrganizationId: Id<'organization'>;
    let _adminOrganizationId: Id<'organization'>;

    beforeEach(async () => {
        const userRandom = Math.random().toString(36).substring(2, 15);
        const adminRandom = Math.random().toString(36).substring(2, 15);

        const user = {
            userId: 'test-user-categories-' + userRandom,
            email: 'categories-test@example.com-' + userRandom,
            name: 'Categories Test User ' + userRandom,
            password: 'test-password',
            role: 'user',
            emailVerified: false,
        };
        const userData = await createTestUser(t, user);
        userId = userData.docId;

        const userOrgId = await createTestOrganization(t, {
            name: 'Categories User Org ' + userRandom,
            slug: 'categories-user-org-' + userRandom,
        });

        await createTestMember(t, {
            organizationId: userOrgId,
            userId,
            role: 'owner',
        });

        userOrganizationId = userOrgId;

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

        const admin = {
            userId: 'test-admin-categories-' + adminRandom,
            email: 'categories-admin@example.com-' + adminRandom,
            name: 'Categories Admin User ' + adminRandom,
            password: 'test-password',
            role: 'admin',
            emailVerified: false,
        };
        const adminData = await createTestUser(t, admin);

        const adminOrgId = await createTestOrganization(t, {
            name: 'Categories Admin Org ' + adminRandom,
            slug: 'categories-admin-org-' + adminRandom,
        });

        await createTestMember(t, {
            organizationId: adminOrgId,
            userId: adminData.docId,
            role: 'owner',
        });

        _adminOrganizationId = adminOrgId;

        adminIdentity = t.withIdentity({
            subject: adminData.docId,
            role: admin.role,
            email: admin.email,
            name: admin.name,
            password: admin.password,
            emailVerified: admin.emailVerified,
            createdAt: Date.now(),
            userId: adminData.docId,
            image: 'https://example.com/image.png',
            banExpires: null,
            banReason: null,
            banned: false,
        });
    });

    describe('createCategory', () => {
        test('creates a new category successfully', async () => {
            const categoryId = await userIdentity.mutation(api.categories.createCategory, {
                name: 'Health',
                color: '#10b981',
                icon: 'heart',
            });

            expect(categoryId).toBeDefined();

            const category = await userIdentity.run(async ctx => ctx.db.get(categoryId));
            expect(category?.name).toBe('Health');
            expect(category?.color).toBe('#10b981');
            expect(category?.icon).toBe('heart');
            expect(category?.userId).toBe(userId);
        });

        test('creates category without icon', async () => {
            const categoryId = await userIdentity.mutation(api.categories.createCategory, {
                name: 'Work',
                color: '#3b82f6',
            });

            const category = await userIdentity.run(async ctx => ctx.db.get(categoryId));
            expect(category?.name).toBe('Work');
            expect(category?.icon).toBeUndefined();
        });

        test('sets timestamps on creation', async () => {
            const before = Date.now();
            const categoryId = await userIdentity.mutation(api.categories.createCategory, {
                name: 'Finance',
                color: '#22c55e',
            });
            const after = Date.now();

            const category = await userIdentity.run(async ctx => ctx.db.get(categoryId));
            expect(category?.createdAt).toBeGreaterThanOrEqual(before);
            expect(category?.createdAt).toBeLessThanOrEqual(after);
            expect(category?.updatedAt).toBe(category?.createdAt);
        });

        test('rejects unauthenticated users', async () => {
            await expect(
                t.mutation(api.categories.createCategory, {
                    name: 'Test',
                    color: '#000000',
                })
            ).rejects.toThrow(/Unauthenticated|User not authenticated|AUTH_REQUIRED/);
        });
    });

    describe('getCategoriesByUser', () => {
        const paginationOpts = { numItems: 50, cursor: null };

        test('returns empty page when user has no categories', async () => {
            const result = await userIdentity.query(api.categories.getCategoriesByUser, {
                paginationOpts,
            });
            expect(result.page).toEqual([]);
            expect(result.isDone).toBe(true);
        });

        test('returns only user own categories', async () => {
            await userIdentity.mutation(api.categories.createCategory, {
                name: 'My Category 1',
                color: '#10b981',
            });
            await userIdentity.mutation(api.categories.createCategory, {
                name: 'My Category 2',
                color: '#3b82f6',
            });

            await adminIdentity.mutation(api.categories.createCategory, {
                name: 'Admin Category',
                color: '#f59e0b',
            });

            const result = await userIdentity.query(api.categories.getCategoriesByUser, {
                paginationOpts,
            });
            expect(result.page).toHaveLength(2);
            expect(result.page.every(category => category.userId === userId)).toBe(true);
        });

        test('returns categories from other members in the active organization', async () => {
            const otherRandom = Math.random().toString(36).substring(2, 15);
            const otherUserData = await createTestUser(t, {
                userId: 'same-org-category-user-' + otherRandom,
                email: 'same-org-category@example.com-' + otherRandom,
                name: 'Same Org Category User ' + otherRandom,
                password: 'test-password',
                role: 'user',
                emailVerified: false,
            });

            await createTestMember(t, {
                organizationId: userOrganizationId,
                userId: otherUserData.docId,
                role: 'member',
            });

            const otherIdentity = t.withIdentity({
                subject: otherUserData.docId,
                role: 'user',
                email: otherUserData.email,
                name: otherUserData.name,
                password: 'test-password',
                emailVerified: false,
                createdAt: Date.now(),
                userId: otherUserData.docId,
                image: 'https://example.com/image.png',
                banExpires: null,
                banReason: null,
                banned: false,
            });

            await otherIdentity.mutation(api.categories.createCategory, {
                name: 'Shared Org Category',
                color: '#10b981',
            });

            const result = await userIdentity.query(api.categories.getCategoriesByUser, {
                paginationOpts,
            });

            expect(result.page.some(category => category.name === 'Shared Org Category')).toBe(
                true
            );
        });

        test('rejects unauthenticated users', async () => {
            await expect(
                t.query(api.categories.getCategoriesByUser, { paginationOpts })
            ).rejects.toThrow(/Unauthenticated|User not authenticated|AUTH_REQUIRED/);
        });
    });

    describe('getCategoryNamesForFilters', () => {
        test('returns unique sorted category names for current user', async () => {
            await userIdentity.mutation(api.categories.createCategory, {
                name: 'Work',
                color: '#10b981',
            });
            await userIdentity.mutation(api.categories.createCategory, {
                name: ' Health ',
                color: '#3b82f6',
            });
            await userIdentity.mutation(api.categories.createCategory, {
                name: 'Personal',
                color: '#f59e0b',
            });

            await adminIdentity.mutation(api.categories.createCategory, {
                name: 'Admin Category',
                color: '#ef4444',
            });

            const result = await userIdentity.query(api.categories.getCategoryNamesForFilters, {});

            expect(result).toEqual(['Health', 'Personal', 'Work']);
        });

        test('rejects unauthenticated users', async () => {
            await expect(t.query(api.categories.getCategoryNamesForFilters, {})).rejects.toThrow(
                /Unauthenticated|User not authenticated|AUTH_REQUIRED/
            );
        });
    });

    describe('updateCategory', () => {
        test('updates category name', async () => {
            const categoryId = await userIdentity.mutation(api.categories.createCategory, {
                name: 'Old Name',
                color: '#10b981',
            });

            await userIdentity.mutation(api.categories.updateCategory, {
                id: categoryId,
                name: 'New Name',
            });

            const updated = await userIdentity.run(async ctx => ctx.db.get(categoryId));
            expect(updated?.name).toBe('New Name');
            expect(updated?.color).toBe('#10b981');
            expect(updated?.userId).toBe(userId);
        });

        test('updates category color', async () => {
            const categoryId = await userIdentity.mutation(api.categories.createCategory, {
                name: 'Test',
                color: '#10b981',
            });

            await userIdentity.mutation(api.categories.updateCategory, {
                id: categoryId,
                color: '#ff0000',
            });

            const updated = await userIdentity.run(async ctx => ctx.db.get(categoryId));
            expect(updated?.color).toBe('#ff0000');
        });

        test('updates category icon', async () => {
            const categoryId = await userIdentity.mutation(api.categories.createCategory, {
                name: 'Test',
                color: '#10b981',
                icon: 'old-icon',
            });

            await userIdentity.mutation(api.categories.updateCategory, {
                id: categoryId,
                icon: 'new-icon',
            });

            const updated = await userIdentity.run(async ctx => ctx.db.get(categoryId));
            expect(updated?.icon).toBe('new-icon');
        });

        test('updates updatedAt timestamp', async () => {
            const categoryId = await userIdentity.mutation(api.categories.createCategory, {
                name: 'Test',
                color: '#10b981',
            });

            const before = await userIdentity.run(async ctx => ctx.db.get(categoryId));

            await new Promise(resolve => setTimeout(resolve, 10));

            await userIdentity.mutation(api.categories.updateCategory, {
                id: categoryId,
                name: 'Updated',
            });

            const after = await userIdentity.run(async ctx => ctx.db.get(categoryId));
            expect(after?.updatedAt).toBeGreaterThan(before!.updatedAt);
        });

        test('preserves unspecified fields', async () => {
            const categoryId = await userIdentity.mutation(api.categories.createCategory, {
                name: 'Original',
                color: '#10b981',
                icon: 'star',
            });

            await userIdentity.mutation(api.categories.updateCategory, {
                id: categoryId,
                name: 'Updated',
            });

            const updated = await userIdentity.run(async ctx => ctx.db.get(categoryId));
            expect(updated?.name).toBe('Updated');
            expect(updated?.color).toBe('#10b981');
            expect(updated?.icon).toBe('star');
        });

        test('rejects unauthenticated users', async () => {
            const categoryId = await userIdentity.mutation(api.categories.createCategory, {
                name: 'Test',
                color: '#10b981',
            });

            await expect(
                t.mutation(api.categories.updateCategory, {
                    id: categoryId,
                    name: 'Hacked',
                })
            ).rejects.toThrow(/Unauthenticated|User not authenticated|AUTH_REQUIRED/);
        });
    });

    describe('deleteCategory', () => {
        test('deletes category successfully', async () => {
            const categoryId = await userIdentity.mutation(api.categories.createCategory, {
                name: 'To Delete',
                color: '#10b981',
            });

            await userIdentity.mutation(api.categories.deleteCategory, { id: categoryId });

            const deleted = await userIdentity.run(async ctx => ctx.db.get(categoryId));
            expect(deleted).toBeNull();
        });

        test('rejects unauthenticated users', async () => {
            const categoryId = await userIdentity.mutation(api.categories.createCategory, {
                name: 'Test',
                color: '#10b981',
            });

            await expect(
                t.mutation(api.categories.deleteCategory, { id: categoryId })
            ).rejects.toThrow(/Unauthenticated|User not authenticated|AUTH_REQUIRED/);
        });
    });

    describe('createDefaultCategories', () => {
        test('creates all 9 default categories', async () => {
            const result = await userIdentity.mutation(api.categories.createDefaultCategories, {});

            expect(result).toHaveLength(9);

            const expectedNames = [
                'Health & Fitness',
                'Career & Business',
                'Learning & Education',
                'Personal Development',
                'Finance & Savings',
                'Relationships',
                'Creative Projects',
                'Home & Organization',
                'Travel & Adventure',
            ];

            const names = result.map(category => category?.name);
            expectedNames.forEach(name => {
                expect(names).toContain(name);
            });
        });

        test('all default categories have colors and icons', async () => {
            const result = await userIdentity.mutation(api.categories.createDefaultCategories, {});

            result.forEach(category => {
                expect(category?.color).toBeDefined();
                expect(category?.color).toMatch(/^#[0-9a-fA-F]{6}$/);
                expect(category?.icon).toBeDefined();
            });
        });

        test('all default categories belong to calling user', async () => {
            const result = await userIdentity.mutation(api.categories.createDefaultCategories, {});

            result.forEach(category => {
                expect(category?.userId).toBe(userId);
            });
        });

        test('rejects unauthenticated users', async () => {
            await expect(t.mutation(api.categories.createDefaultCategories, {})).rejects.toThrow(
                /Unauthenticated|User not authenticated|AUTH_REQUIRED/
            );
        });
    });
});
