import { beforeEach, describe, expect, test } from 'vitest';
import { api, internal } from '../_generated/api';
import { initConvexTest } from './test.helper';
import { createTestUser, createTestOrganization, createTestMember } from './test_helpers';
import { TestConvexForDataModel } from 'convex-test';
import { DataModel, Id } from '../_generated/dataModel';

describe('categories integrity', async () => {
    const t = initConvexTest();
    let userIdentity: TestConvexForDataModel<DataModel>;
    let userId: Id<'user'>;
    let organizationId: Id<'organization'>;

    beforeEach(async () => {
        const userRandom = Math.random().toString(36).substring(2, 15);

        const user = {
            userId: 'test-user-integrity-' + userRandom,
            email: 'integrity-test@example.com-' + userRandom,
            name: 'Integrity Test User ' + userRandom,
            password: 'test-password',
            role: 'user',
            emailVerified: false,
        };
        const userData = await createTestUser(t, user);
        userId = userData.docId;

        const orgId = await createTestOrganization(t, {
            name: 'Integrity Test Org ' + userRandom,
            slug: 'integrity-test-org-' + userRandom,
        });
        organizationId = orgId;

        await createTestMember(t, {
            organizationId: orgId,
            userId,
            role: 'owner',
        });

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
    });

    describe('deleteCategory integrity', () => {
        test('cannot delete category with associated objectives', async () => {
            const categoryId = await userIdentity.mutation(api.categories.createCategory, {
                name: 'Test Category',
                color: '#10b981',
            });

            await userIdentity.mutation(api.objectives.createObjective, {
                title: 'Test Objective',
                categoryId,
                targetValue: 100,
            });

            await expect(
                userIdentity.mutation(api.categories.deleteCategory, { id: categoryId })
            ).rejects.toThrow(/CATEGORY_HAS_OBJECTIVES/);

            const category = await userIdentity.run(async ctx => ctx.db.get(categoryId));
            expect(category).not.toBeNull();
        });

        test('can delete category without objectives', async () => {
            const categoryId = await userIdentity.mutation(api.categories.createCategory, {
                name: 'Empty Category',
                color: '#10b981',
            });

            await userIdentity.mutation(api.categories.deleteCategory, { id: categoryId });

            const category = await userIdentity.run(async ctx => ctx.db.get(categoryId));
            expect(category).toBeNull();
        });

        test('cannot delete category from different organization', async () => {
            const otherRandom = Math.random().toString(36).substring(2, 15);
            const otherUser = await createTestUser(t, {
                userId: 'other-user-' + otherRandom,
                email: 'other@example.com-' + otherRandom,
                name: 'Other User',
                password: 'test-password',
                role: 'user',
                emailVerified: false,
            });

            const otherOrg = await createTestOrganization(t, {
                name: 'Other Org ' + otherRandom,
                slug: 'other-org-' + otherRandom,
            });

            await createTestMember(t, {
                organizationId: otherOrg,
                userId: otherUser.docId,
                role: 'owner',
            });

            const otherIdentity = t.withIdentity({
                subject: otherUser.docId,
                role: 'user',
                email: otherUser.email,
                name: otherUser.name,
                password: otherUser.password,
                emailVerified: false,
                createdAt: Date.now(),
                userId: otherUser.docId,
                image: 'https://example.com/image.png',
                banExpires: null,
                banReason: null,
                banned: false,
            });

            const categoryId = await otherIdentity.mutation(api.categories.createCategory, {
                name: 'Other Category',
                color: '#10b981',
            });

            await expect(
                userIdentity.mutation(api.categories.deleteCategory, { id: categoryId })
            ).rejects.toThrow(/CATEGORY_NOT_FOUND|FORBIDDEN/);
        });

        test('cannot delete non-existent category', async () => {
            const categoryId = await userIdentity.mutation(api.categories.createCategory, {
                name: 'Temp Category',
                color: '#10b981',
            });

            await userIdentity.mutation(api.categories.deleteCategory, { id: categoryId });

            await expect(
                userIdentity.mutation(api.categories.deleteCategory, { id: categoryId })
            ).rejects.toThrow(/CATEGORY_NOT_FOUND/);
        });
    });

    describe('createCategory duplicate prevention', () => {
        test('cannot create duplicate category name in same organization', async () => {
            await userIdentity.mutation(api.categories.createCategory, {
                name: 'Unique Category',
                color: '#10b981',
            });

            await expect(
                userIdentity.mutation(api.categories.createCategory, {
                    name: 'Unique Category',
                    color: '#3b82f6',
                })
            ).rejects.toThrow(/DUPLICATE_CATEGORY_NAME/);
        });

        test('cannot create duplicate with different case trimming', async () => {
            await userIdentity.mutation(api.categories.createCategory, {
                name: '  Test Category  ',
                color: '#10b981',
            });

            await expect(
                userIdentity.mutation(api.categories.createCategory, {
                    name: 'Test Category',
                    color: '#3b82f6',
                })
            ).rejects.toThrow(/DUPLICATE_CATEGORY_NAME/);
        });

        test('cannot create category with empty name after trimming', async () => {
            await expect(
                userIdentity.mutation(api.categories.createCategory, {
                    name: '   ',
                    color: '#10b981',
                })
            ).rejects.toThrow(/VALIDATION_ERROR/);
        });

        test('can create same category name in different organization', async () => {
            const otherOrg = await createTestOrganization(t, {
                name: 'Second Org',
                slug: 'second-org-' + Math.random().toString(36).substring(2, 8),
            });

            await createTestMember(t, {
                organizationId: otherOrg,
                userId,
                role: 'owner',
            });

            const category1Id = await userIdentity.run(async ctx =>
                ctx.db.insert('categories', {
                    userId,
                    organizationId,
                    name: 'Shared Category',
                    color: '#10b981',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                })
            );

            const category2Id = await userIdentity.run(async ctx =>
                ctx.db.insert('categories', {
                    userId,
                    organizationId: otherOrg,
                    name: 'Shared Category',
                    color: '#3b82f6',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                })
            );

            const org1Categories = await userIdentity.run(async ctx =>
                ctx.db
                    .query('categories')
                    .withIndex('by_organization_name', q =>
                        q.eq('organizationId', organizationId).eq('name', 'Shared Category')
                    )
                    .collect()
            );

            const org2Categories = await userIdentity.run(async ctx =>
                ctx.db
                    .query('categories')
                    .withIndex('by_organization_name', q =>
                        q.eq('organizationId', otherOrg).eq('name', 'Shared Category')
                    )
                    .collect()
            );

            expect(org1Categories).toHaveLength(1);
            expect(org2Categories).toHaveLength(1);
            expect(org1Categories[0]._id).toBe(category1Id);
            expect(org2Categories[0]._id).toBe(category2Id);
            expect(category1Id).not.toBe(category2Id);
        });
    });

    describe('updateCategory duplicate prevention', () => {
        test('cannot update to duplicate category name', async () => {
            const category1 = await userIdentity.mutation(api.categories.createCategory, {
                name: 'First Category',
                color: '#10b981',
            });

            await userIdentity.mutation(api.categories.createCategory, {
                name: 'Second Category',
                color: '#3b82f6',
            });

            await expect(
                userIdentity.mutation(api.categories.updateCategory, {
                    id: category1,
                    name: 'Second Category',
                })
            ).rejects.toThrow(/DUPLICATE_CATEGORY_NAME/);
        });

        test('can update to same name with different case', async () => {
            const categoryId = await userIdentity.mutation(api.categories.createCategory, {
                name: 'My Category',
                color: '#10b981',
            });

            await userIdentity.mutation(api.categories.updateCategory, {
                id: categoryId,
                name: '  my category  ',
            });

            const updated = await userIdentity.run(async ctx => ctx.db.get(categoryId));
            expect(updated?.name).toBe('my category');
        });
    });

    describe('createDefaultCategories idempotency', () => {
        test('running createDefaultCategories twice does not create duplicates', async () => {
            const firstRun = await userIdentity.mutation(
                internal.categories.createDefaultCategories,
                {}
            );
            expect(firstRun).toHaveLength(9);

            const secondRun = await userIdentity.mutation(
                internal.categories.createDefaultCategories,
                {}
            );

            expect(secondRun).toHaveLength(0);

            const allCategories = await userIdentity.run(async ctx =>
                ctx.db
                    .query('categories')
                    .withIndex('by_organization', q => q.eq('organizationId', organizationId))
                    .collect()
            );

            expect(allCategories).toHaveLength(9);
        });

        test('partial default categories are filled in', async () => {
            await userIdentity.mutation(api.categories.createCategory, {
                name: 'Health & Fitness',
                color: '#10b981',
                icon: 'heart',
            });

            await userIdentity.mutation(api.categories.createCategory, {
                name: 'Career & Business',
                color: '#3b82f6',
                icon: 'briefcase',
            });

            const result = await userIdentity.mutation(
                internal.categories.createDefaultCategories,
                {}
            );

            expect(result).toHaveLength(7);

            const allCategories = await userIdentity.run(async ctx =>
                ctx.db
                    .query('categories')
                    .withIndex('by_organization', q => q.eq('organizationId', organizationId))
                    .collect()
            );

            expect(allCategories).toHaveLength(9);
        });
    });

    describe('categoryId referential integrity in objectives', () => {
        test('objective stores the categoryId reference', async () => {
            const categoryId = await userIdentity.mutation(api.categories.createCategory, {
                name: 'Test Category',
                color: '#10b981',
            });

            const objectiveId = await userIdentity.mutation(api.objectives.createObjective, {
                title: 'Test Objective',
                categoryId,
                targetValue: 100,
            });

            const objective = await userIdentity.run(async ctx => ctx.db.get(objectiveId));

            expect(objective?.categoryId).toBe(categoryId);
        });

        test('objective with categoryId can be queried by categoryId index', async () => {
            const categoryId = await userIdentity.mutation(api.categories.createCategory, {
                name: 'Query Test',
                color: '#10b981',
            });

            const objectiveId = await userIdentity.mutation(api.objectives.createObjective, {
                title: 'Query Objective',
                categoryId,
                targetValue: 100,
            });

            const objectives = await userIdentity.run(async ctx =>
                ctx.db
                    .query('objectives')
                    .withIndex('by_categoryId', q => q.eq('categoryId', categoryId))
                    .collect()
            );

            expect(objectives).toHaveLength(1);
            expect(objectives[0]._id).toBe(objectiveId);
        });

        test('renaming a category keeps the objective categoryId reference intact', async () => {
            // categoryId is the single source of truth: renaming the category only
            // updates the categories row, never the linked objectives.
            const categoryId = await userIdentity.mutation(api.categories.createCategory, {
                name: 'Original Name',
                color: '#10b981',
            });

            const objectiveId = await userIdentity.mutation(api.objectives.createObjective, {
                title: 'Test Objective',
                categoryId,
                targetValue: 100,
            });

            await userIdentity.mutation(api.categories.updateCategory, {
                id: categoryId,
                name: 'New Name',
            });

            const objective = await userIdentity.run(async ctx => ctx.db.get(objectiveId));
            expect(objective?.categoryId).toBe(categoryId);

            const category = await userIdentity.run(async ctx => ctx.db.get(categoryId));
            expect(category?.name).toBe('New Name');
        });

        test('objective can use a category created by another member in the same organization', async () => {
            const otherRandom = Math.random().toString(36).substring(2, 15);
            const otherUser = await createTestUser(t, {
                userId: 'same-org-objective-category-' + otherRandom,
                email: 'same-org-objective-category@example.com-' + otherRandom,
                name: 'Same Org Objective Category User',
                password: 'test-password',
                role: 'user',
                emailVerified: false,
            });

            await createTestMember(t, {
                organizationId,
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

            const categoryId = await otherIdentity.mutation(api.categories.createCategory, {
                name: 'Team Category',
                color: '#10b981',
            });

            const objectiveId = await userIdentity.mutation(api.objectives.createObjective, {
                title: 'Objective With Team Category',
                categoryId,
                targetValue: 100,
            });

            const objective = await userIdentity.run(async ctx => ctx.db.get(objectiveId));

            expect(objective?.categoryId).toBe(categoryId);
        });
    });
});
