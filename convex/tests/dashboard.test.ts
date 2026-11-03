import { beforeEach, describe, expect, test, vi } from 'vitest';
import { api } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { initConvexTest } from './test.helper';
import {
    createTestMember,
    createTestOrganization,
    createTestUser,
    TIME,
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

    test('aggregates status, progress and categories for the active organization @REQ-DASHBOARD-001 @INH-DAS-02', async () => {
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

        await ownerIdentity.mutation(api.progress.createProgress, {
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

        await ownerIdentity.mutation(api.progress.createProgress, {
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

    test('does not count objectives from another organization @REQ-DASHBOARD-001 @REQ-NF-003', async () => {
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

    test('keeps stats in sync when an objective is deleted @REQ-DASHBOARD-001 @INH-PAP-01', async () => {
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
        ).resolves.toMatchObject({
            total: 1,
            active: 1,
            completed: 0,
            averageProgress: 0,
        });
    });

    const create = (title: string, extra: { targetValue?: number; deadline?: number } = {}) =>
        asUser(owner).mutation(api.objectives.createObjective, {
            title,
            startValue: 0,
            targetValue: 10,
            ...extra,
        });

    const log = (objectiveId: Id<'objectives'>, updatedValue: number, updateDate: number) =>
        asUser(owner).mutation(api.progress.createProgress, {
            objectiveId,
            updatedValue,
            updateDate,
        });

    test('ranks the visible objectives by progress and validates the limit @REQ-DASHBOARD-002 @INH-DAS-05', async () => {
        const low = await create('Low');
        const high = await create('High');
        const trashed = await create('Trashed');
        await log(low, 2, Date.UTC(2026, 0, 1));
        await log(high, 8, Date.UTC(2026, 0, 1));
        await log(trashed, 9, Date.UTC(2026, 0, 1));
        await asUser(owner).mutation(api.objectives.deleteObjective, { id: trashed });

        const ranking = await asUser(owner).query(api.dashboard.getTopObjectives, { limit: 5 });

        expect(ranking.map(entry => [entry.title, entry.progressPercent])).toEqual([
            ['High', 80],
            ['Low', 20],
        ]);

        for (const limit of [0, 101, 1.5]) {
            await expect(
                asUser(owner).query(api.dashboard.getTopObjectives, { limit })
            ).rejects.toThrow('VALIDATION_ERROR');
        }
    });

    test('counts progress entries per UTC month over the last twelve months @REQ-DASHBOARD-003', async () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(Date.UTC(2026, 9, 15, 12));

        try {
            const objectiveId = await create('Monthly', { targetValue: 100 });
            await log(objectiveId, 1, Date.UTC(2026, 9, 1));
            await log(objectiveId, 1, Date.UTC(2026, 9, 14));
            await log(objectiveId, 1, Date.UTC(2026, 7, 31));
            await log(objectiveId, 1, Date.UTC(2025, 9, 1));

            const months = await asUser(owner).query(api.dashboard.getMonthlyUpdates, {});

            expect(months).toHaveLength(12);
            expect(months[0]).toEqual({ month: '2025-11', count: 0 });
            expect(months.at(-3)).toEqual({ month: '2026-08', count: 1 });
            expect(months.at(-1)).toEqual({ month: '2026-10', count: 2 });
        } finally {
            vi.useRealTimers();
        }
    });

    test('lists active objectives by deadline with their due-soon warning @REQ-DASHBOARD-004 @REQ-DASHBOARD-005', async () => {
        const later = await create('Later', { deadline: Date.UTC(2099, 5, 1) });
        const sooner = await create('Sooner', { deadline: Date.UTC(2099, 0, 1) });
        const done = await create('Done', { targetValue: 1, deadline: Date.UTC(2098, 0, 1) });
        await create('Open-ended');
        await log(done, 1, Date.UTC(2026, 0, 1));
        await asUser(owner).mutation(api.objectives.updateObjective, {
            id: later,
            dueSoonDays: 30,
        });

        const upcoming = await asUser(owner).query(api.dashboard.getUpcomingDeadlines, {});

        expect(upcoming.map(entry => [entry.id, entry.dueSoonDays])).toEqual([
            [sooner, 7],
            [later, 30],
        ]);
    });

    test('counts what was created, updated and completed in the last seven days @REQ-DASHBOARD-006', async () => {
        const now = Date.UTC(2026, 9, 15, 12);
        vi.useFakeTimers({ toFake: ['Date'] });

        try {
            vi.setSystemTime(now - 10 * TIME.DAY_MS);
            const old = await create('Old', { targetValue: 2 });
            await log(old, 1, Date.UTC(2026, 9, 1));

            vi.setSystemTime(now - TIME.DAY_MS);
            const recent = await create('Recent', { targetValue: 1 });
            await log(recent, 1, Date.UTC(2026, 9, 14));
            await log(old, 0.5, Date.UTC(2026, 9, 14));

            vi.setSystemTime(now);
            expect(await asUser(owner).query(api.dashboard.getRecentActivity, {})).toEqual({
                created: 1,
                updates: 2,
                completed: 1,
            });
        } finally {
            vi.useRealTimers();
        }
    });
});
