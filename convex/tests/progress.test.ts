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

const page = { numItems: 20, cursor: null };

describe('progress', () => {
    const t = initConvexTest();
    let owner: TestUserData;
    let ownerIdentity: ReturnType<typeof t.withIdentity>;
    let organizationId: Id<'organization'>;

    beforeEach(async () => {
        const suffix = Math.random().toString(36).slice(2, 10);
        owner = await createTestUser(t, {
            userId: `progress-owner-${suffix}`,
            email: `progress-owner-${suffix}@example.com`,
            name: 'Progress owner',
            role: 'user',
        });
        organizationId = await createTestOrganization(t, {
            name: `Progress ${suffix}`,
            slug: `progress-${suffix}`,
        });
        await createTestMember(t, { organizationId, userId: owner.docId, role: 'owner' });
        ownerIdentity = t.withIdentity(identityFor(owner));
    });

    const createObjective = (
        values: { startValue: number; targetValue: number; direction?: 'increase' | 'decrease' } = {
            startValue: 0,
            targetValue: 10,
        }
    ) => ownerIdentity.mutation(api.objectives.createObjective, { title: 'Tracked', ...values });

    const log = (objectiveId: Id<'objectives'>, updatedValue: number, day = 2) =>
        ownerIdentity.mutation(api.progress.createProgress, {
            objectiveId,
            updatedValue,
            updateDate: Date.UTC(2026, 0, day),
        });

    const get = (id: Id<'objectives'>) => ownerIdentity.query(api.objectives.getObjective, { id });

    test('a decreasing objective with negative values reaches its target and closes @REQ-PROGRESO-001 @REQ-PROGRESO-005 @INH-OBJ-01 @INH-OBJ-07 @INH-OBJ-17 @INH-PRO-03', async () => {
        const objectiveId = await createObjective({
            direction: 'decrease',
            startValue: 5,
            targetValue: -3,
        });

        const first = await log(objectiveId, -4, 1);
        expect(await get(objectiveId)).toMatchObject({ currentValue: 1, progressPercent: 50 });

        await log(objectiveId, 1.5, 2);
        expect(await get(objectiveId)).toMatchObject({ currentValue: 2.5, progressPercent: 31 });

        await log(objectiveId, -5.5, 3);
        const completed = await get(objectiveId);

        expect(completed).toMatchObject({
            currentValue: -3,
            status: 'completed',
            progressPercent: 100,
        });
        expect(completed?.completedAt).toBeTypeOf('number');

        await expect(log(objectiveId, 1, 4)).rejects.toThrow('OBJECTIVE_ALREADY_COMPLETED');
        await expect(
            ownerIdentity.mutation(api.progress.updateProgress, {
                id: first.id,
                updatedValue: -1,
                updateDate: Date.UTC(2026, 0, 1),
            })
        ).rejects.toThrow('OBJECTIVE_ALREADY_COMPLETED');
        await expect(
            ownerIdentity.mutation(api.progress.deleteProgress, { id: first.id })
        ).rejects.toThrow('OBJECTIVE_ALREADY_COMPLETED');

        expect(await get(objectiveId)).toEqual(completed);

        const entries = await ownerIdentity.query(api.progress.listProgress, {
            objectiveId,
            paginationOpts: page,
        });

        expect(entries.page.map(entry => entry.canEdit)).toEqual([false, false, false]);
    });

    test('correcting or deleting an old entry adjusts the current value by its difference @REQ-PROGRESO-003 @INH-PRO-04', async () => {
        const objectiveId = await createObjective({ startValue: 10, targetValue: 100 });
        const oldest = await log(objectiveId, 5, 1);
        const middle = await log(objectiveId, -2, 2);
        await log(objectiveId, 7, 3);

        await ownerIdentity.mutation(api.progress.updateProgress, {
            id: oldest.id,
            updatedValue: 12,
            updateDate: Date.UTC(2026, 0, 1),
        });
        expect(await get(objectiveId)).toMatchObject({ currentValue: 27 });

        await ownerIdentity.mutation(api.progress.deleteProgress, { id: middle.id });
        expect(await get(objectiveId)).toMatchObject({ currentValue: 29, status: 'active' });

        const history = await ownerIdentity.query(api.progress.getProgressHistory, { objectiveId });

        expect(history.points.map(point => [point.delta, point.value])).toEqual([
            [12, 22],
            [7, 29],
        ]);
    });

    test('a correction that reaches the target completes the objective @REQ-PROGRESO-003', async () => {
        const increasing = await createObjective({ startValue: 2, targetValue: 10 });
        const entry = await log(increasing, 3);

        await ownerIdentity.mutation(api.progress.updateProgress, {
            id: entry.id,
            updatedValue: 8,
            updateDate: Date.UTC(2026, 0, 2),
        });
        expect(await get(increasing)).toMatchObject({ currentValue: 10, status: 'completed' });

        // Deleting a step back in a decreasing objective can also reach the target.
        const decreasing = await createObjective({
            direction: 'decrease',
            startValue: 10,
            targetValue: 5,
        });

        const stepBack = await log(decreasing, 2, 1);
        await log(decreasing, -5, 2);
        expect(await get(decreasing)).toMatchObject({ currentValue: 7, status: 'active' });

        await ownerIdentity.mutation(api.progress.deleteProgress, { id: stepBack.id });
        expect(await get(decreasing)).toMatchObject({ currentValue: 5, status: 'completed' });
    });

    test('keeps decimal totals free of floating-point drift', async () => {
        const objectiveId = await createObjective({ startValue: 0, targetValue: 100 });
        const first = await log(objectiveId, 0.1);
        await log(objectiveId, 0.2);
        expect(await get(objectiveId)).toMatchObject({ currentValue: 0.3 });

        await ownerIdentity.mutation(api.progress.updateProgress, {
            id: first.id,
            updatedValue: 0.7,
            updateDate: Date.UTC(2026, 0, 2),
        });
        expect(await get(objectiveId)).toMatchObject({ currentValue: 0.9 });
    });

    test('rejects a zero difference without changing entries or totals @INH-PRO-02', async () => {
        const objectiveId = await createObjective();
        const entry = await log(objectiveId, 1);
        const before = await get(objectiveId);

        await expect(log(objectiveId, 0)).rejects.toThrow('PROGRESS_ZERO');
        await expect(
            ownerIdentity.mutation(api.progress.updateProgress, {
                id: entry.id,
                updatedValue: 0,
                updateDate: Date.UTC(2026, 0, 2),
            })
        ).rejects.toThrow('PROGRESS_ZERO');

        expect(await get(objectiveId)).toEqual(before);

        const entries = await ownerIdentity.query(api.progress.listProgress, {
            objectiveId,
            paginationOpts: page,
        });

        expect(entries.page.map(listed => listed.updatedValue)).toEqual([1]);
    });

    test('accepts any calendar day up to today and no later one @REQ-PROGRESO-002', async () => {
        const today = Date.UTC(2026, 0, 10);
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(today + 12 * 60 * 60 * 1000);

        try {
            const objectiveId = await createObjective();

            const dated = (updateDate: number) =>
                ownerIdentity.mutation(api.progress.createProgress, {
                    objectiveId,
                    updatedValue: 1,
                    updateDate,
                });

            // From UTC+14 it is already tomorrow.
            await expect(dated(today + TIME.DAY_MS)).resolves.toMatchObject({ updatedValue: 1 });
            await expect(dated(Date.UTC(2010, 0, 1))).resolves.toMatchObject({ updatedValue: 1 });
            await expect(dated(today + 2 * TIME.DAY_MS)).rejects.toThrow('FUTURE_DATE_NOT_ALLOWED');
            await expect(dated(today + 60 * 1000)).rejects.toThrow('VALIDATION_ERROR');
            expect(await get(objectiveId)).toMatchObject({ currentValue: 2 });
        } finally {
            vi.useRealTimers();
        }
    });

    test('returns the cumulative history in chronological order @REQ-OBJETIVOS-007 @REQ-PROGRESO-004 @INH-PRO-05', async () => {
        const objectiveId = await createObjective({ startValue: 5, targetValue: 50 });

        for (const [day, difference, comment] of [
            [3, 4, undefined],
            [1, 2, 'first'],
            [2, -1.5, undefined],
        ] as const) {
            await ownerIdentity.mutation(api.progress.createProgress, {
                objectiveId,
                updatedValue: difference,
                updateDate: Date.UTC(2026, 0, day),
                comment,
            });
        }

        const history = await ownerIdentity.query(api.progress.getProgressHistory, { objectiveId });

        expect(history).toEqual({
            isTruncated: false,
            points: [
                expect.objectContaining({ value: 7, delta: 2, comment: 'first' }),
                expect.objectContaining({ value: 5.5, delta: -1.5 }),
                expect.objectContaining({ value: 9.5, delta: 4 }),
            ],
        });
    });

    test('keeps only the latest 500 entries in the history, with exact values @INH-PRO-05', async () => {
        const objectiveId = await createObjective({ startValue: 0, targetValue: 1000 });

        await t.run(async ctx => {
            for (let day = 1; day <= 501; day += 1) {
                await ctx.db.insert('progressUpdates', {
                    objective: objectiveId,
                    organizationId,
                    createdBy: owner.docId,
                    updatedValue: 1,
                    updateDate: Date.UTC(2024, 0, day),
                    createdAt: 1,
                    updatedAt: 1,
                });
            }

            await ctx.db.patch('objectives', objectiveId, { currentValue: 501 });
        });

        const history = await ownerIdentity.query(api.progress.getProgressHistory, { objectiveId });

        expect(history.isTruncated).toBe(true);
        expect(history.points).toHaveLength(500);
        expect(history.points[0]).toMatchObject({ updateDate: Date.UTC(2024, 0, 2), value: 2 });
        expect(history.points.at(-1)).toMatchObject({ value: 501 });
    });

    test('paginates entries and scopes reused cursors to the requested objective', async () => {
        const firstObjective = await createObjective();
        const secondObjective = await createObjective();

        for (let day = 1; day <= 3; day += 1) {
            await log(firstObjective, day, day);
        }

        await log(secondObjective, 1, 1);

        const firstPage = await ownerIdentity.query(api.progress.listProgress, {
            objectiveId: firstObjective,
            paginationOpts: { numItems: 1, cursor: null },
        });

        expect(firstPage.isDone).toBe(false);

        const next = await ownerIdentity.query(api.progress.listProgress, {
            objectiveId: firstObjective,
            paginationOpts: { numItems: 1, cursor: firstPage.continueCursor },
        });

        expect(next.page.map(entry => entry.updatedValue)).toEqual([2]);

        const reused = await ownerIdentity.query(api.progress.listProgress, {
            objectiveId: secondObjective,
            paginationOpts: { numItems: 10, cursor: firstPage.continueCursor },
        });

        expect(reused.page.every(entry => entry.objectiveId === secondObjective)).toBe(true);
    });
});
