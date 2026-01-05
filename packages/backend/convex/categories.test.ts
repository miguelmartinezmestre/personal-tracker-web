import { convexTest } from 'convex-test';
import { describe, expect, test, beforeEach } from 'vitest';
import { api } from './_generated/api';
import schema from './schema';
import { modules } from '../test.setup';
import { createTestUser } from './test_helpers';

describe('convex categories', async () => {
    let t: ReturnType<typeof convexTest>;
    let userId: string;
    let userIdentity: ReturnType<ReturnType<typeof convexTest>['withIdentity']>;
    let adminIdentity: ReturnType<ReturnType<typeof convexTest>['withIdentity']>;

    beforeEach(async () => {
        t = convexTest(schema, modules);
        userIdentity = t.withIdentity({
            subject: 'test-user-categories',
            role: 'user',
        });

        adminIdentity = t.withIdentity({
            subject: 'test-admin-categories',
            role: 'admin',
        });

        const result = await userIdentity.run(async ctx => {
            return await createTestUser(ctx, {
                userId: 'test-user-categories',
                email: 'categories-test@example.com',
                name: 'Categories Test User',
                password: 'test-password',
                role: 'user',
                emailVerified: false,
            });
        });
        userId = result.userId;

        await adminIdentity.run(async ctx => {
            return await createTestUser(ctx, {
                userId: 'test-admin-categories',
                email: 'categories-admin@example.com',
                name: 'Categories Admin User',
                password: 'test-password',
                role: 'admin',
                emailVerified: false,
            });
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
            expect(category?.user).toBe(userId);
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
            ).rejects.toThrow(/Unauthenticated|User not authenticated/);
        });
    });

    describe('getCategoriesByUser', () => {
        test('returns empty array when user has no categories', async () => {
            const categories = await userIdentity.query(api.categories.getCategoriesByUser, {});
            expect(categories).toEqual([]);
        });

        test('returns only user own categories', async () => {
            // Create categories for the test user
            await userIdentity.mutation(api.categories.createCategory, {
                name: 'My Category 1',
                color: '#10b981',
            });
            await userIdentity.mutation(api.categories.createCategory, {
                name: 'My Category 2',
                color: '#3b82f6',
            });

            // Create category for admin user
            await adminIdentity.mutation(api.categories.createCategory, {
                name: 'Admin Category',
                color: '#f59e0b',
            });

            const userCategories = await userIdentity.query(api.categories.getCategoriesByUser, {});
            expect(userCategories).toHaveLength(2);
            expect(userCategories.every(c => c.user === userId)).toBe(true);
        });

        test('rejects unauthenticated users', async () => {
            await expect(t.query(api.categories.getCategoriesByUser, {})).rejects.toThrow(
                /Unauthenticated|User not authenticated/
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
            ).rejects.toThrow(/Unauthenticated|User not authenticated/);
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
            ).rejects.toThrow(/Unauthenticated|User not authenticated/);
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

            const names = result.map(c => c?.name);
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
                expect(category?.user).toBe(userId);
            });
        });

        test('rejects unauthenticated users', async () => {
            await expect(t.mutation(api.categories.createDefaultCategories, {})).rejects.toThrow(
                /Unauthenticated|User not authenticated/
            );
        });
    });
});
