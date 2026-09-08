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
});
