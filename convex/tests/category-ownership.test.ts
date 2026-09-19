import { describe, expect, test } from 'vitest';
import { api } from '../_generated/api';
import { initConvexTest } from './test.helper';
import {
    createTestMember,
    createTestOrganization,
    createTestUser,
    createTestObjective,
} from './test_helpers';
import { identityFor } from './test_identities';

describe('shared category ownership', () => {
    const t = initConvexTest();
    let sequence = 0;

    async function fixture() {
        const suffix = ++sequence;
        const organizationId = await createTestOrganization(t, {
            name: 'Category permissions',
            slug: `category-permissions-${suffix}`,
        });
        const users = await Promise.all(
            ['creator', 'member', 'admin'].map(name =>
                createTestUser(t, {
                    userId: `${name}-${suffix}`,
                    email: `${name}-${suffix}@example.test`,
                    name,
                    role: 'user',
                })
            )
        );
        for (const [index, user] of users.entries()) {
            await createTestMember(t, {
                organizationId,
                userId: user.docId,
                role: index === 2 ? 'admin' : 'member',
            });
        }
        const [creator, member, admin] = users.map(user => t.withIdentity(identityFor(user)));
        const categoryId = await creator.mutation(api.categories.createCategory, {
            name: 'Shared',
            color: '#123456',
        });
        return { creator, member, admin, categoryId, organizationId, users };
    }

    test('a member can use but cannot rename or delete another member category', async () => {
        const { member, categoryId } = await fixture();
        await member.mutation(api.objectives.createObjective, {
            title: 'Uses shared category',
            targetValue: 100,
            categoryId,
        });
        await expect(
            member.mutation(api.categories.updateCategory, { id: categoryId, name: 'Changed' })
        ).rejects.toThrow(/FORBIDDEN/);
        await expect(
            member.mutation(api.categories.deleteCategory, { id: categoryId })
        ).rejects.toThrow(/FORBIDDEN/);
    });

    test('a creator cannot delete a category referenced by another member private objective', async () => {
        const { creator, member, categoryId, organizationId, users } = await fixture();
        const memberUser = users.at(1);
        if (!memberUser) {
            throw new Error('Missing fixture member');
        }
        const objectiveId = await createTestObjective(t, {
            userId: memberUser.docId,
            organizationId,
            title: 'Private objective',
            targetValue: 100,
            categoryId,
            visibility: 'private',
        });
        await expect(
            creator.mutation(api.categories.deleteCategory, { id: categoryId })
        ).rejects.toThrow(/CATEGORY_HAS_OBJECTIVES/);
        await member.mutation(api.objectives.deleteObjective, { id: objectiveId });
        await expect(
            creator.mutation(api.categories.deleteCategory, { id: categoryId })
        ).rejects.toThrow(/CATEGORY_HAS_OBJECTIVES/);
    });

    test('the creator and organization administrator can rename an unused category', async () => {
        const { creator, admin, categoryId } = await fixture();
        await creator.mutation(api.categories.updateCategory, {
            id: categoryId,
            name: 'Creator edit',
        });
        await admin.mutation(api.categories.updateCategory, { id: categoryId, name: 'Admin edit' });
        await admin.mutation(api.categories.deleteCategory, { id: categoryId });
        expect(await t.run(ctx => ctx.db.get('categories', categoryId))).toBeNull();
    });

    test('a global administrator can edit and delete a category in another organization', async () => {
        const suffix = ++sequence;
        const owner = await createTestUser(t, {
            userId: `category-owner-${suffix}`,
            email: `category-owner-${suffix}@example.test`,
            name: 'Category owner',
            role: 'user',
        });
        const organizationId = await createTestOrganization(t, {
            name: `Category organization ${suffix}`,
            slug: `category-organization-${suffix}`,
        });
        await createTestMember(t, {
            organizationId,
            userId: owner.docId,
            role: 'owner',
        });
        const ownerIdentity = t.withIdentity(identityFor(owner));
        const categoryId = await ownerIdentity.mutation(api.categories.createCategory, {
            name: 'Global administration',
            color: '#123456',
        });
        const globalAdmin = await createTestUser(t, {
            userId: `category-global-admin-${suffix}`,
            email: `category-global-admin-${suffix}@example.test`,
            name: 'Global administrator',
            role: 'globalAdmin',
        });
        const globalAdminOrganizationId = await createTestOrganization(t, {
            name: `Global administrator organization ${suffix}`,
            slug: `global-administrator-organization-${suffix}`,
        });
        await createTestMember(t, {
            organizationId: globalAdminOrganizationId,
            userId: globalAdmin.docId,
            role: 'owner',
        });
        const globalAdminIdentity = t.withIdentity(identityFor(globalAdmin));

        await globalAdminIdentity.mutation(api.categories.updateCategory, {
            id: categoryId,
            name: 'Global administration updated',
        });
        await globalAdminIdentity.mutation(api.categories.deleteCategory, { id: categoryId });

        expect(await t.run(ctx => ctx.db.get('categories', categoryId))).toBeNull();
    });
});
