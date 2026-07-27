import { beforeEach, describe, expect, test } from 'vitest';
import { api } from '../_generated/api';
import { initConvexTest } from './test.helper';
import { createTestMember, createTestOrganization, createTestUser } from './test_helpers';
import type { DataModel, Id } from '../_generated/dataModel';
import type { TestConvexForDataModel } from 'convex-test';

describe('convex categories', async () => {
    const t = initConvexTest();
    let userIdentity: TestConvexForDataModel<DataModel>;
    let adminIdentity: TestConvexForDataModel<DataModel>;
    let userId: Id<'user'>;
    let userOrganizationId: Id<'organization'>;

    beforeEach(async () => {
        const userRandom = Math.random().toString(36).substring(2, 15);
        const userData = await createTestUser(t, {
            userId: 'test-user-categories-' + userRandom,
            email: 'categories-test@example.com-' + userRandom,
            name: 'Categories Test User ' + userRandom,
            password: 'test-password',
            role: 'user',
            emailVerified: false,
        });
        userId = userData.docId;

        userOrganizationId = await createTestOrganization(t, {
            name: 'Categories User Org ' + userRandom,
            slug: 'categories-user-org-' + userRandom,
        });
        await createTestMember(t, { organizationId: userOrganizationId, userId, role: 'owner' });

        userIdentity = t.withIdentity({
            subject: userData.docId,
            role: userData.role ?? 'user',
            email: userData.email,
            name: userData.name,
            password: 'test-password',
            emailVerified: false,
            createdAt: Date.now(),
            userId: userData.docId,
            image: 'https://example.com/image.png',
            banExpires: null,
            banReason: null,
            banned: false,
        });

        const adminRandom = Math.random().toString(36).substring(2, 15);
        const adminData = await createTestUser(t, {
            userId: 'test-admin-categories-' + adminRandom,
            email: 'categories-admin@example.com-' + adminRandom,
            name: 'Categories Admin User ' + adminRandom,
            password: 'test-password',
            role: 'globalAdmin',
            emailVerified: false,
        });
        const adminOrganizationId = await createTestOrganization(t, {
            name: 'Categories Admin Org ' + adminRandom,
            slug: 'categories-admin-org-' + adminRandom,
        });
        await createTestMember(t, {
            organizationId: adminOrganizationId,
            userId: adminData.docId,
            role: 'owner',
        });
        adminIdentity = t.withIdentity({
            subject: adminData.docId,
            role: adminData.role ?? 'globalAdmin',
            email: adminData.email,
            name: adminData.name,
            password: 'test-password',
            emailVerified: false,
            createdAt: Date.now(),
            userId: adminData.docId,
            image: 'https://example.com/image.png',
            banExpires: null,
            banReason: null,
            banned: false,
        });
    });

    test('creates categories with optional icon and owner metadata', async () => {
        const withIconId = await userIdentity.mutation(api.categories.createCategory, {
            name: 'Health',
            color: '#10b981',
            icon: 'heart',
        });
        const withoutIconId = await userIdentity.mutation(api.categories.createCategory, {
            name: 'Work',
            color: '#3b82f6',
        });

        const [withIcon, withoutIcon] = await userIdentity.run(async ctx => {
            return Promise.all([ctx.db.get(withIconId), ctx.db.get(withoutIconId)]);
        });

        expect(withIcon).toMatchObject({
            name: 'Health',
            color: '#10b981',
            icon: 'heart',
            userId,
        });
        expect(withoutIcon).toMatchObject({
            name: 'Work',
            color: '#3b82f6',
            userId,
        });
        expect(withoutIcon?.icon).toBeUndefined();
    });

    test('lists active organization categories without leaking other organizations', async () => {
        await userIdentity.mutation(api.categories.createCategory, {
            name: 'Mine',
            color: '#10b981',
        });
        await adminIdentity.mutation(api.categories.createCategory, {
            name: 'Other Org',
            color: '#f59e0b',
        });

        const otherUser = await createTestUser(t, {
            userId: 'same-org-category-user-' + Math.random().toString(36).substring(2, 10),
            email: 'same-org-category@example.com',
            name: 'Same Org Category User',
            password: 'test-password',
            role: 'user',
            emailVerified: false,
        });
        await createTestMember(t, {
            organizationId: userOrganizationId,
            userId: otherUser.docId,
            role: 'member',
        });
        const otherIdentity = t.withIdentity({
            subject: otherUser.docId,
            role: 'user',
            email: otherUser.email,
            name: otherUser.name,
            password: 'test-password',
            emailVerified: false,
            createdAt: Date.now(),
            userId: otherUser.docId,
            image: 'https://example.com/image.png',
            banExpires: null,
            banReason: null,
            banned: false,
        });
        await otherIdentity.mutation(api.categories.createCategory, {
            name: 'Same Org',
            color: '#6366f1',
        });

        const result = await userIdentity.query(api.categories.getCategoriesByUser, {
            paginationOpts: { numItems: 50, cursor: null },
        });

        expect(result.page.map(category => category.name).sort()).toEqual(['Mine', 'Same Org']);
        expect(result.isDone).toBe(true);
    });

    test('updates provided fields while preserving omitted fields', async () => {
        const categoryId = await userIdentity.mutation(api.categories.createCategory, {
            name: 'Original',
            color: '#10b981',
            icon: 'star',
        });

        await userIdentity.mutation(api.categories.updateCategory, {
            id: categoryId,
            name: 'Updated',
        });
        await userIdentity.mutation(api.categories.updateCategory, {
            id: categoryId,
            color: '#ff0000',
            icon: 'target',
        });

        const updated = await userIdentity.run(async ctx => ctx.db.get(categoryId));
        expect(updated).toMatchObject({
            name: 'Updated',
            color: '#ff0000',
            icon: 'target',
            userId,
        });
    });

    test('deletes categories', async () => {
        const categoryId = await userIdentity.mutation(api.categories.createCategory, {
            name: 'To Delete',
            color: '#10b981',
        });

        await userIdentity.mutation(api.categories.deleteCategory, { id: categoryId });

        await expect(userIdentity.run(async ctx => ctx.db.get(categoryId))).resolves.toBeNull();
    });

    test('creates the default category set for the caller', async () => {
        const result = await userIdentity.mutation(api.categories.createDefaultCategories, {});
        const names = result.map(category => category?.name);

        expect(result).toHaveLength(9);
        expect(names).toEqual(
            expect.arrayContaining([
                'Health & Fitness',
                'Career & Business',
                'Learning & Education',
                'Personal Development',
                'Finance & Savings',
                'Relationships',
                'Creative Projects',
                'Home & Organization',
                'Travel & Adventure',
            ])
        );
        expect(result.every(category => category?.userId === userId)).toBe(true);
        expect(result.every(category => /^#[0-9a-fA-F]{6}$/.test(category?.color ?? ''))).toBe(
            true
        );
        expect(result.every(category => category?.icon)).toBe(true);
    });

    test('category functions reject unauthenticated callers', async () => {
        const categoryId = await userIdentity.mutation(api.categories.createCategory, {
            name: 'Private',
            color: '#10b981',
        });

        await expect(
            t.mutation(api.categories.createCategory, { name: 'Test', color: '#000000' })
        ).rejects.toThrow(/Unauthenticated|User not authenticated|AUTH_REQUIRED/);
        await expect(
            t.query(api.categories.getCategoriesByUser, {
                paginationOpts: { numItems: 10, cursor: null },
            })
        ).rejects.toThrow(/Unauthenticated|User not authenticated|AUTH_REQUIRED/);
        await expect(
            t.mutation(api.categories.updateCategory, { id: categoryId, name: 'Hacked' })
        ).rejects.toThrow(/Unauthenticated|User not authenticated|AUTH_REQUIRED/);
        await expect(t.mutation(api.categories.deleteCategory, { id: categoryId })).rejects.toThrow(
            /Unauthenticated|User not authenticated|AUTH_REQUIRED/
        );
        await expect(t.mutation(api.categories.createDefaultCategories, {})).rejects.toThrow(
            /Unauthenticated|User not authenticated|AUTH_REQUIRED/
        );
    });
});
