import { beforeEach, describe, expect, test } from 'vitest';
import { api, internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { initConvexTest } from './test.helper';
import {
    createTestMember,
    createTestOrganization,
    createTestUser,
    type TestUserData,
} from './test.helpers';
import { identityFor } from './test.identities';

const page = { numItems: 20, cursor: null };
const health = { name: 'Health', color: '#EF4444', icon: 'heart' };

describe('categories', () => {
    const t = initConvexTest();
    let organizationId: Id<'organization'>;
    let owner: TestUserData;
    let creator: TestUserData;
    let member: TestUserData;

    const as = (user: TestUserData) => t.withIdentity(identityFor(user));

    async function joinAs(
        role: string,
        name: string,
        platformRole = 'user',
        organization = organizationId
    ) {
        const suffix = Math.random().toString(36).slice(2, 10);

        const user = await createTestUser(t, {
            userId: `${name}-${suffix}`,
            email: `${name}-${suffix}@example.com`,
            name,
            role: platformRole,
        });

        await createTestMember(t, { organizationId: organization, userId: user.docId, role });

        return user;
    }

    const createOrganization = () => {
        const suffix = Math.random().toString(36).slice(2, 10);

        return createTestOrganization(t, { name: `Other ${suffix}`, slug: `other-${suffix}` });
    };

    const categoriesOf = (id: Id<'organization'>) =>
        t.run(ctx =>
            ctx.db
                .query('categories')
                .withIndex('by_organization', q => q.eq('organizationId', id))
                .collect()
        );

    beforeEach(async () => {
        const suffix = Math.random().toString(36).slice(2, 10);
        organizationId = await createTestOrganization(t, {
            name: `Categories ${suffix}`,
            slug: `categories-${suffix}`,
        });
        owner = await joinAs('owner', 'owner');
        creator = await joinAs('member', 'creator');
        member = await joinAs('member', 'member');
    });

    test('any member creates categories; only their creator, the owner and admins change them @REQ-CATEGORIAS-001 @REQ-CATEGORIAS-003 @INH-CAT-01 @INH-CAT-02', async () => {
        const id = await as(creator).mutation(api.categories.createCategory, { category: health });

        await expect(
            as(member).mutation(api.categories.createCategory, {
                category: { ...health, name: ' Health ' },
            })
        ).rejects.toThrow('CATEGORY_NAME_TAKEN');
        await expect(
            as(member).mutation(api.categories.createCategory, {
                category: { ...health, name: 'Sport', icon: 'rocket' },
            })
        ).rejects.toThrow('VALIDATION_ERROR');

        const listed = await as(member).query(api.categories.listCategories, {
            paginationOpts: page,
        });

        expect(listed.page).toEqual([{ id, ...health, canManage: false }]);

        const renamed = { ...health, name: 'Wellbeing' };

        await expect(
            as(member).mutation(api.categories.updateCategory, { id, category: renamed })
        ).rejects.toThrow('FORBIDDEN');
        await expect(as(member).mutation(api.categories.deleteCategory, { id })).rejects.toThrow(
            'FORBIDDEN'
        );

        await as(owner).mutation(api.categories.updateCategory, { id, category: renamed });
        expect((await categoriesOf(organizationId)).map(category => category.name)).toEqual([
            'Wellbeing',
        ]);

        await as(creator).mutation(api.categories.deleteCategory, { id });
        expect(await categoriesOf(organizationId)).toEqual([]);
    });

    test('the global admin gets no access to organization categories from its role @REQ-CATEGORIAS-003 @REQ-ROLES-001', async () => {
        const id = await as(owner).mutation(api.categories.createCategory, { category: health });
        const memberAdmin = await joinAs('member', 'member-admin', 'globalAdmin');

        const outsideAdmin = await joinAs(
            'owner',
            'outside-admin',
            'globalAdmin',
            await createOrganization()
        );

        await expect(
            as(memberAdmin).mutation(api.categories.deleteCategory, { id })
        ).rejects.toThrow('FORBIDDEN');
        await expect(
            as(outsideAdmin).mutation(api.categories.deleteCategory, { id })
        ).rejects.toThrow('CATEGORY_NOT_FOUND');
    });

    test('a category used by any objective, even private or in the trash, is not deleted @REQ-CATEGORIAS-003 @REQ-OBJETIVOS-004', async () => {
        const categoryId = await as(creator).mutation(api.categories.createCategory, {
            category: health,
        });

        const objectiveId = await as(member).mutation(api.objectives.createObjective, {
            title: 'Private goal',
            categoryId,
            startValue: 0,
            targetValue: 10,
            memberAccess: 'none',
        });

        await expect(
            as(creator).mutation(api.categories.deleteCategory, { id: categoryId })
        ).rejects.toThrow('CATEGORY_IN_USE');

        await as(member).mutation(api.objectives.deleteObjective, { id: objectiveId });
        await expect(
            as(creator).mutation(api.categories.deleteCategory, { id: categoryId })
        ).rejects.toThrow('CATEGORY_IN_USE');
    });

    test('organizations start without categories and keep a copy of what the owner chose @REQ-CATEGORIAS-002 @INH-ADM-07', async () => {
        const admin = await joinAs('member', 'platform-admin', 'globalAdmin');
        const user = await joinAs('member', 'new-user', 'user', await createOrganization());

        await expect(
            as(user).mutation(api.platformCategories.createPlatformCategory, { category: health })
        ).rejects.toThrow('FORBIDDEN');

        const catalogId = await as(admin).mutation(api.platformCategories.createPlatformCategory, {
            category: health,
        });

        const catalog = await as(user).query(api.platformCategories.listPlatformCategories, {});

        expect(catalog).toEqual([{ id: catalogId, ...health }]);

        await t.mutation(internal.auth.ensureDefaultOrganizationForUser, { userId: user.docId });
        const personalId = await as(user).query(api.organizations.getPersonalOrganizationId, {});

        if (!personalId) {
            throw new Error('Expected a personal organization');
        }

        expect(await categoriesOf(personalId)).toEqual([]);

        const chosen = [
            { ...health, name: 'Salud' },
            { ...health, name: 'Salud' },
        ];

        await as(user).mutation(api.categories.addChosenCategories, {
            organizationId: personalId,
            categories: chosen,
        });

        await as(admin).mutation(api.platformCategories.updatePlatformCategory, {
            id: catalogId,
            category: { ...health, color: '#000000' },
        });
        await as(admin).mutation(api.platformCategories.deletePlatformCategory, { id: catalogId });

        expect(
            (await categoriesOf(personalId)).map(({ name, color }) => ({ name, color }))
        ).toEqual([{ name: 'Salud', color: health.color }]);

        await expect(
            as(member).mutation(api.categories.addChosenCategories, {
                organizationId,
                categories: chosen,
            })
        ).rejects.toThrow('FORBIDDEN');
    });
});
