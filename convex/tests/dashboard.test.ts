import { beforeEach, describe, expect, test } from 'vitest';
import { api } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { initConvexTest } from './test.helper';
import {
    createTestMember,
    createTestOrganization,
    createTestUser,
    type TestUserData,
} from './test.helpers';
import { identityFor } from './test.identities';

describe('dashboard stats', () => {
    const t = initConvexTest();
    let owner: TestUserData;
    let organizationId: Id<'organization'>;

    function asUser(user: TestUserData) {
        return t.withIdentity(identityFor(user));
    }

    async function createCategory(name: string, color: string) {
        const now = Date.now();

        return await t.run(ctx =>
            ctx.db.insert('categories', {
                userId: owner.docId,
                organizationId,
                name,
                color,
                createdAt: now,
                updatedAt: now,
            })
        );
    }

    beforeEach(async () => {
        const suffix = Math.random().toString(36).slice(2, 10);
        owner = await createTestUser(t, {
            userId: `dashboard-owner-${suffix}`,
            email: `dashboard-owner-${suffix}@example.com`,
            name: 'Dashboard owner',
            role: 'user',
        });
        organizationId = await createTestOrganization(t, {
            name: `Dashboard ${suffix}`,
            slug: `dashboard-${suffix}`,
        });
        await createTestMember(t, { organizationId, userId: owner.docId, role: 'owner' });
    });

    test('returns zeroed stats for an organization without objectives', async () => {
        await expect(asUser(owner).query(api.dashboard.getDashboardStats, {})).resolves.toEqual({
            total: 0,
            active: 0,
            completed: 0,
            averageProgress: 0,
            categories: [],
        });
    });

    test('aggregates status, progress and categories for the active organization', async () => {
        const ownerIdentity = asUser(owner);
        const health = await createCategory('Health', '#EF4444');
        const career = await createCategory('Career', '#3B82F6');
        await ownerIdentity.mutation(api.objectives.createObjective, {
            title: 'Run',
            startValue: 0,
            targetValue: 10,
            categoryId: health,
        });

        const swim = await ownerIdentity.mutation(api.objectives.createObjective, {
            title: 'Swim',
            startValue: 0,
            targetValue: 4,
            categoryId: health,
        });

        await ownerIdentity.mutation(api.objectives.createProgress, {
            objectiveId: swim,
            updatedValue: 4,
            updateDate: Date.UTC(2026, 0, 1),
        });

        const read = await ownerIdentity.mutation(api.objectives.createObjective, {
            title: 'Read',
            startValue: 0,
            targetValue: 10,
            categoryId: career,
        });

        await ownerIdentity.mutation(api.objectives.createProgress, {
            objectiveId: read,
            updatedValue: 5,
            updateDate: Date.UTC(2026, 0, 1),
        });
        await ownerIdentity.mutation(api.objectives.createObjective, {
            title: 'Uncategorised',
            startValue: 0,
            targetValue: 1,
        });

        const stats = await ownerIdentity.query(api.dashboard.getDashboardStats, {});

        expect(stats).toMatchObject({
            total: 4,
            active: 3,
            completed: 1,
            averageProgress: 38,
        });
        expect(stats.categories).toEqual([
            {
                categoryId: health,
                name: 'Health',
                color: '#EF4444',
                total: 2,
                completed: 1,
                averageProgress: 50,
            },
            {
                categoryId: career,
                name: 'Career',
                color: '#3B82F6',
                total: 1,
                completed: 0,
                averageProgress: 50,
            },
            {
                categoryId: null,
                name: null,
                color: null,
                total: 1,
                completed: 0,
                averageProgress: 0,
            },
        ]);
    });

    test('listCategories only offers a next page when this organization has one', async () => {
        await createCategory('Health', '#EF4444');
        await createCategory('Career', '#3B82F6');

        const otherOrganizationId = await createTestOrganization(t, {
            name: `Other categories ${Math.random().toString(36).slice(2, 10)}`,
            slug: `other-categories-${Math.random().toString(36).slice(2, 10)}`,
        });

        const now = Date.now();
        await t.run(ctx =>
            ctx.db.insert('categories', {
                organizationId: otherOrganizationId,
                name: 'Elsewhere',
                color: '#000000',
                createdAt: now,
                updatedAt: now,
            })
        );

        const full = await asUser(owner).query(api.categories.listCategories, {
            paginationOpts: { numItems: 2, cursor: null },
        });

        expect(full.page.map(category => category.name)).toEqual(['Health', 'Career']);
        expect(full.isDone).toBe(true);

        await createCategory('Finance', '#22C55E');

        const again = await asUser(owner).query(api.categories.listCategories, {
            paginationOpts: { numItems: 2, cursor: null },
        });

        expect(again.isDone).toBe(false);
    });

    test('does not count objectives from another organization', async () => {
        const suffix = Math.random().toString(36).slice(2, 10);

        const outsider = await createTestUser(t, {
            userId: `dashboard-outsider-${suffix}`,
            email: `dashboard-outsider-${suffix}@example.com`,
            name: 'Outsider',
            role: 'user',
        });

        const otherOrganizationId = await createTestOrganization(t, {
            name: `Other ${suffix}`,
            slug: `other-${suffix}`,
        });

        await createTestMember(t, {
            organizationId: otherOrganizationId,
            userId: outsider.docId,
            role: 'owner',
        });
        await asUser(owner).mutation(api.objectives.createObjective, {
            title: 'Owner only',
            startValue: 0,
            targetValue: 3,
        });

        const stats = await asUser(outsider).query(api.dashboard.getDashboardStats, {});
        expect(stats.total).toBe(0);
    });

    test('keeps stats in sync when an objective is deleted', async () => {
        const ownerIdentity = asUser(owner);
        await ownerIdentity.mutation(api.objectives.createObjective, {
            title: 'Kept',
            startValue: 0,
            targetValue: 10,
        });

        const removed = await ownerIdentity.mutation(api.objectives.createObjective, {
            title: 'Removed',
            startValue: 0,
            targetValue: 10,
        });

        await ownerIdentity.mutation(api.objectives.deleteObjective, { id: removed });
        await expect(
            ownerIdentity.query(api.dashboard.getDashboardStats, {})
        ).resolves.toMatchObject({ total: 1, active: 1, completed: 0, averageProgress: 0 });
    });
});
