import { beforeEach, describe, expect, test, vi } from 'vitest';
import { api } from '../_generated/api';
import { initConvexTest } from './test.helper';
import {
    createTestMember,
    createTestOrganization,
    createTestUser,
    type TestUserData,
} from './test.helpers';
import { identityFor } from './test.identities';

const page = { numItems: 20, cursor: null };

describe('trash', () => {
    const t = initConvexTest();
    let organizationId: string;
    let owner: TestUserData;
    let creator: TestUserData;
    let member: TestUserData;

    const as = (user: TestUserData) => t.withIdentity(identityFor(user));

    async function joinAs(role: string, name: string) {
        const suffix = Math.random().toString(36).slice(2, 10);

        const user = await createTestUser(t, {
            userId: `${name}-${suffix}`,
            email: `${name}-${suffix}@example.com`,
            name,
            role: 'user',
        });

        await createTestMember(t, { organizationId, userId: user.docId, role });

        return user;
    }

    beforeEach(async () => {
        const suffix = Math.random().toString(36).slice(2, 10);
        organizationId = await createTestOrganization(t, {
            name: `Trash ${suffix}`,
            slug: `trash-${suffix}`,
        });
        owner = await joinAs('owner', 'owner');
        creator = await joinAs('member', 'creator');
        member = await joinAs('member', 'member');
    });

    async function createWithProgress(title = 'Old goal') {
        const objectiveId = await as(creator).mutation(api.objectives.createObjective, {
            title,
            startValue: 0,
            targetValue: 10,
            memberAccess: 'edit',
        });

        await as(creator).mutation(api.progress.createProgress, {
            objectiveId,
            updatedValue: 4,
            updateDate: Date.UTC(2026, 0, 2),
        });

        return objectiveId;
    }

    const trashIds = async (user: TestUserData) =>
        (await as(user).query(api.trash.listTrash, { paginationOpts: page })).page.map(
            objective => objective.id
        );

    test('deleting moves the objective to the trash and hides it everywhere else @REQ-COLABORACION-002 @INH-PAP-01', async () => {
        const objectiveId = await createWithProgress();
        await as(creator).mutation(api.objectives.deleteObjective, { id: objectiveId });

        expect(
            (await as(owner).query(api.objectives.listObjectives, { paginationOpts: page })).page
        ).toEqual([]);
        expect(await as(owner).query(api.objectives.getObjective, { id: objectiveId })).toBeNull();
        expect((await as(owner).query(api.dashboard.getDashboardStats, {})).total).toBe(0);
        await expect(
            as(member).mutation(api.progress.createProgress, {
                objectiveId,
                updatedValue: 1,
                updateDate: Date.UTC(2026, 0, 3),
            })
        ).rejects.toThrow('OBJECTIVE_NOT_FOUND');
        await t.run(async ctx => {
            expect(await ctx.db.get('objectives', objectiveId)).toMatchObject({
                deletedBy: creator.docId,
                currentValue: 4,
            });
        });
    });

    test('the creator, the owner and the admins see the trash and restore with its history @INH-PAP-02', async () => {
        const objectiveId = await createWithProgress();
        await as(owner).mutation(api.objectives.deleteObjective, { id: objectiveId });

        expect(await trashIds(creator)).toEqual([objectiveId]);
        expect(await trashIds(owner)).toEqual([objectiveId]);
        expect(await trashIds(member)).toEqual([]);
        await expect(
            as(member).mutation(api.trash.restoreObjective, { id: objectiveId })
        ).rejects.toThrow('NOT_AUTHORIZED_OBJECTIVE');

        await as(creator).mutation(api.trash.restoreObjective, { id: objectiveId });

        expect(await trashIds(owner)).toEqual([]);
        expect(
            await as(member).query(api.objectives.getObjective, { id: objectiveId })
        ).toMatchObject({
            currentValue: 4,
            progressPercent: 40,
        });
        expect(
            (await as(member).query(api.progress.getProgressHistory, { objectiveId })).points
        ).toHaveLength(1);
    });

    test('the trash keeps paging past objectives the user sees but cannot manage @INH-PAP-02', async () => {
        const create = (user: TestUserData, title: string) =>
            as(user).mutation(api.objectives.createObjective, {
                title,
                startValue: 0,
                targetValue: 10,
                memberAccess: 'view',
            });

        const older = await create(creator, 'Older own goal');
        const others = await create(owner, 'Owner goal');
        const newer = await create(creator, 'Newer own goal');

        for (const [index, id] of [older, others, newer].entries()) {
            await as(owner).mutation(api.objectives.deleteObjective, { id });
            await t.run(ctx => ctx.db.patch('objectives', id, { deletedAt: index + 1 }));
        }

        const listPage = (cursor: string | null) =>
            as(creator).query(api.trash.listTrash, { paginationOpts: { numItems: 1, cursor } });

        const seen: string[] = [];
        let result = await listPage(null);

        seen.push(...result.page.map(objective => objective.id));

        while (!result.isDone) {
            result = await listPage(result.continueCursor);
            seen.push(...result.page.map(objective => objective.id));
        }

        expect(seen).toEqual([newer, older]);
    });

    test('only objectives in the trash can be restored or purged @INH-PAP-03', async () => {
        const objectiveId = await createWithProgress();

        for (const mutation of [api.trash.restoreObjective, api.trash.purgeObjective]) {
            await expect(as(owner).mutation(mutation, { id: objectiveId })).rejects.toThrow(
                'OBJECTIVE_NOT_FOUND'
            );
        }
    });

    test('purging deletes the objective, its progress and permissions in batches, and cannot be undone @INH-PAP-03 @INH-PAP-05 @REQ-NF-011', async () => {
        const objectiveId = await createWithProgress();

        await t.run(async ctx => {
            for (let index = 0; index < 60; index += 1) {
                await ctx.db.insert('progressUpdates', {
                    objective: objectiveId,
                    organizationId,
                    createdBy: creator.docId,
                    updatedValue: 1,
                    updateDate: Date.UTC(2026, 0, 1),
                    resultingValue: 1,
                    createdAt: 1,
                    updatedAt: 1,
                });
            }
        });

        await as(creator).mutation(api.objectives.deleteObjective, { id: objectiveId });
        vi.useFakeTimers();

        try {
            await as(owner).mutation(api.trash.purgeObjective, { id: objectiveId });

            expect(await trashIds(owner)).toEqual([]);
            await expect(
                as(owner).mutation(api.trash.restoreObjective, { id: objectiveId })
            ).rejects.toThrow('OBJECTIVE_NOT_FOUND');

            await t.finishAllScheduledFunctions(() => vi.runAllTimers());
        } finally {
            vi.useRealTimers();
        }

        await t.run(async ctx => {
            expect(await ctx.db.get('objectives', objectiveId)).toBeNull();
            expect(
                await ctx.db
                    .query('progressUpdates')
                    .withIndex('by_objective_date', q => q.eq('objective', objectiveId))
                    .first()
            ).toBeNull();
        });
    });
});
