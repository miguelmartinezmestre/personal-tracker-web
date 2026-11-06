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

describe('objectives', () => {
    const t = initConvexTest();
    let ownerIdentity: ReturnType<typeof t.withIdentity>;
    let organizationId: string;

    function asUser(user: TestUserData) {
        return t.withIdentity(identityFor(user));
    }

    async function createUserInNewOrganization(prefix: string) {
        const suffix = Math.random().toString(36).slice(2, 10);

        const user = await createTestUser(t, {
            userId: `${prefix}-${suffix}`,
            email: `${prefix}-${suffix}@example.com`,
            name: prefix,
            role: 'user',
        });

        const organization = await createTestOrganization(t, {
            name: `${prefix} ${suffix}`,
            slug: `${prefix}-${suffix}`,
        });

        await createTestMember(t, {
            organizationId: organization,
            userId: user.docId,
            role: 'owner',
        });

        return { user, organization };
    }

    async function createCategory(name: string, organization = organizationId) {
        return await t.run(ctx =>
            ctx.db.insert('categories', {
                organizationId: organization,
                name,
                color: '#22c55e',
                createdAt: Date.now(),
                updatedAt: Date.now(),
            })
        );
    }

    const create = (
        title: string,
        extra: Partial<{ startValue: number; targetValue: number }> = {}
    ) =>
        ownerIdentity.mutation(api.objectives.createObjective, {
            title,
            startValue: 0,
            targetValue: 10,
            ...extra,
        });

    const get = (id: Id<'objectives'>) => ownerIdentity.query(api.objectives.getObjective, { id });

    beforeEach(async () => {
        const created = await createUserInNewOrganization('objective-owner');
        organizationId = created.organization;
        ownerIdentity = asUser(created.user);
    });

    test('creates an increasing objective by default and lists it as active @REQ-OBJETIVOS-001 @REQ-OBJETIVOS-002 @INH-OBJ-02', async () => {
        const objectiveId = await ownerIdentity.mutation(api.objectives.createObjective, {
            title: 'Run',
            startValue: 0,
            targetValue: 10,
            unit: 'km',
        });

        const listed = await ownerIdentity.query(api.objectives.listObjectives, {
            status: 'active',
            paginationOpts: page,
        });

        expect(listed.page).toEqual([
            expect.objectContaining({
                id: objectiveId,
                direction: 'increase',
                status: 'active',
                currentValue: 0,
                progressPercent: 0,
                unit: 'km',
                canManage: true,
            }),
        ]);
    });

    test.each([
        ['increase', 10, -5],
        ['decrease', -5, 3],
    ] as const)(
        'rejects a target that does not %s from %d to %d on create and update @INH-OBJ-03',
        async (direction, startValue, targetValue) => {
            const objectiveId = await create('Valid range', { startValue: 2, targetValue: 8 });
            const before = await get(objectiveId);

            await expect(
                ownerIdentity.mutation(api.objectives.createObjective, {
                    title: 'Invalid range',
                    direction,
                    startValue,
                    targetValue,
                })
            ).rejects.toThrow('TARGET_DIRECTION_MISMATCH');
            await expect(
                ownerIdentity.mutation(api.objectives.updateObjective, {
                    id: objectiveId,
                    direction,
                    startValue,
                    targetValue,
                })
            ).rejects.toThrow('TARGET_DIRECTION_MISMATCH');

            expect(await get(objectiveId)).toEqual(before);
        }
    );

    test('completes an objective whose new target or direction is already reached @REQ-OBJETIVOS-003 @INH-OBJ-08', async () => {
        const objectiveId = await create('Adjustable', { startValue: 2, targetValue: 10 });

        await ownerIdentity.mutation(api.progress.createProgress, {
            objectiveId,
            updatedValue: 6,
            updateDate: Date.UTC(2026, 0, 2),
        });

        expect(
            await ownerIdentity.mutation(api.objectives.updateObjective, {
                id: objectiveId,
                targetValue: 12,
            })
        ).toMatchObject({ currentValue: 8, status: 'active', progressPercent: 60 });

        const completed = await ownerIdentity.mutation(api.objectives.updateObjective, {
            id: objectiveId,
            targetValue: 8,
        });

        expect(completed).toMatchObject({
            currentValue: 8,
            status: 'completed',
            progressPercent: 100,
        });
        expect(completed.completedAt).toBeTypeOf('number');

        const flipped = await create('Flipped', { startValue: 5, targetValue: 10 });

        expect(
            await ownerIdentity.mutation(api.objectives.updateObjective, {
                id: flipped,
                direction: 'decrease',
                targetValue: 5,
                startValue: 6,
            })
        ).toMatchObject({ direction: 'decrease', currentValue: 6, status: 'active' });
    });

    test('a completed objective is closed to edits @REQ-OBJETIVOS-003 @INH-OBJ-07', async () => {
        const objectiveId = await create('Finished', { targetValue: 1 });

        await ownerIdentity.mutation(api.progress.createProgress, {
            objectiveId,
            updatedValue: 1,
            updateDate: Date.UTC(2026, 0, 2),
        });

        const completed = await get(objectiveId);

        await expect(
            ownerIdentity.mutation(api.objectives.updateObjective, {
                id: objectiveId,
                title: 'New',
            })
        ).rejects.toThrow('OBJECTIVE_ALREADY_COMPLETED');
        await expect(
            ownerIdentity.mutation(api.objectives.updateObjective, {
                id: objectiveId,
                targetValue: 5,
            })
        ).rejects.toThrow('OBJECTIVE_ALREADY_COMPLETED');

        expect(await get(objectiveId)).toEqual(completed);
    });

    test('moves the recorded progress with a new starting value @INH-OBJ-09', async () => {
        const objectiveId = await create('Changing baseline', { startValue: 2, targetValue: 10 });

        await ownerIdentity.mutation(api.progress.createProgress, {
            objectiveId,
            updatedValue: 3,
            updateDate: Date.UTC(2026, 0, 2),
        });

        expect(
            await ownerIdentity.mutation(api.objectives.updateObjective, {
                id: objectiveId,
                startValue: -1,
            })
        ).toMatchObject({ startValue: -1, currentValue: 2, status: 'active' });

        expect(
            await ownerIdentity.mutation(api.objectives.updateObjective, {
                id: objectiveId,
                startValue: 7,
            })
        ).toMatchObject({ currentValue: 10, status: 'completed' });
    });

    test('accepts a deadline from the earliest current day on Earth and keeps one already passed @REQ-OBJETIVOS-005 @INH-OBJ-10', async () => {
        const today = Date.UTC(2026, 0, 10);
        const yesterday = today - TIME.DAY_MS;
        vi.useFakeTimers({ toFake: ['Date'] });

        try {
            vi.setSystemTime(today + 5 * 60 * 60 * 1000);
            await expect(
                ownerIdentity.mutation(api.objectives.createObjective, {
                    title: 'Due yesterday in UTC',
                    startValue: 0,
                    targetValue: 10,
                    deadline: yesterday,
                })
            ).resolves.toBeTypeOf('string');

            vi.setSystemTime(today + 13 * 60 * 60 * 1000);
            await expect(
                ownerIdentity.mutation(api.objectives.createObjective, {
                    title: 'Too late',
                    startValue: 0,
                    targetValue: 10,
                    deadline: yesterday,
                })
            ).rejects.toThrow('DEADLINE_TOO_OLD');
            await expect(
                ownerIdentity.mutation(api.objectives.createObjective, {
                    title: 'Not a calendar day',
                    startValue: 0,
                    targetValue: 10,
                    deadline: today + 1,
                })
            ).rejects.toThrow('VALIDATION_ERROR');

            const objectiveId = await ownerIdentity.mutation(api.objectives.createObjective, {
                title: 'Due today',
                startValue: 0,
                targetValue: 10,
                deadline: today,
            });

            vi.setSystemTime(today + 3 * TIME.DAY_MS);
            await expect(
                ownerIdentity.mutation(api.objectives.updateObjective, {
                    id: objectiveId,
                    deadline: today + TIME.DAY_MS,
                })
            ).rejects.toThrow('DEADLINE_TOO_OLD');

            expect(
                await ownerIdentity.mutation(api.objectives.updateObjective, {
                    id: objectiveId,
                    title: 'Overdue, renamed',
                })
            ).toMatchObject({ title: 'Overdue, renamed', deadline: today });
        } finally {
            vi.useRealTimers();
        }
    });

    test('keeps a due-soon warning of at least one day only while there is a deadline @INH-OBJ-19', async () => {
        const deadline = Date.UTC(2099, 0, 1);

        const objectiveId = await ownerIdentity.mutation(api.objectives.createObjective, {
            title: 'With deadline',
            startValue: 0,
            targetValue: 10,
            deadline,
        });

        expect(await get(objectiveId)).toMatchObject({ deadline, dueSoonDays: 7 });

        expect(
            await ownerIdentity.mutation(api.objectives.updateObjective, {
                id: objectiveId,
                dueSoonDays: 30,
            })
        ).toMatchObject({ dueSoonDays: 30 });

        for (const dueSoonDays of [0, 1.5]) {
            await expect(
                ownerIdentity.mutation(api.objectives.updateObjective, {
                    id: objectiveId,
                    dueSoonDays,
                })
            ).rejects.toThrow('VALIDATION_ERROR');
        }

        const cleared = await ownerIdentity.mutation(api.objectives.updateObjective, {
            id: objectiveId,
            deadline: null,
        });

        expect(cleared.deadline).toBeUndefined();
        expect(cleared.dueSoonDays).toBeUndefined();
    });

    test('paginates objectives within the active organization and status filter @REQ-NF-008 @INH-REN-02', async () => {
        const first = await create('First');
        const second = await create('Second');
        const completed = await create('Completed');

        await ownerIdentity.mutation(api.progress.createProgress, {
            objectiveId: completed,
            updatedValue: 10,
            updateDate: Date.UTC(2026, 0, 2),
        });

        const firstPage = await ownerIdentity.query(api.objectives.listObjectives, {
            status: 'active',
            paginationOpts: { numItems: 1, cursor: null },
        });

        expect(firstPage.page).toHaveLength(1);
        expect(firstPage.isDone).toBe(false);

        const next = await ownerIdentity.query(api.objectives.listObjectives, {
            status: 'active',
            paginationOpts: { numItems: 1, cursor: firstPage.continueCursor },
        });

        expect([first, second]).toContain(next.page[0]?.id);
        expect(next.page[0]?.id).not.toBe(firstPage.page[0]?.id);
    });

    test('searches titles combined with the status and category filters @REQ-OBJETIVOS-008', async () => {
        const health = await createCategory('Health');
        const morningRun = await create('Morning run');

        const eveningRun = await ownerIdentity.mutation(api.objectives.createObjective, {
            title: 'Evening run',
            startValue: 0,
            targetValue: 1,
            categoryId: health,
        });

        await ownerIdentity.mutation(api.progress.createProgress, {
            objectiveId: eveningRun,
            updatedValue: 1,
            updateDate: Date.UTC(2026, 0, 2),
        });
        await create('Read books');
        const other = await createUserInNewOrganization('objective-search');
        await asUser(other.user).mutation(api.objectives.createObjective, {
            title: 'Morning run',
            startValue: 0,
            targetValue: 10,
        });

        const search = async (filters: { status?: 'active'; categoryId?: string }) =>
            (
                await ownerIdentity.query(api.objectives.listObjectives, {
                    ...filters,
                    search: ' run ',
                    paginationOpts: page,
                })
            ).page.map(objective => objective.id);

        expect((await search({})).sort()).toEqual([morningRun, eveningRun].sort());
        expect(await search({ status: 'active' })).toEqual([morningRun]);
        expect(await search({ categoryId: health })).toEqual([eveningRun]);
    });

    test('filters by category and status, and a malformed category matches nothing @REQ-OBJETIVOS-004', async () => {
        const health = await createCategory('Health');
        const study = await createCategory('Study');

        const run = await ownerIdentity.mutation(api.objectives.createObjective, {
            title: 'Run',
            startValue: 0,
            targetValue: 1,
            categoryId: health,
        });

        const swim = await ownerIdentity.mutation(api.objectives.createObjective, {
            title: 'Swim',
            startValue: 0,
            targetValue: 10,
            categoryId: health,
        });

        await ownerIdentity.mutation(api.objectives.createObjective, {
            title: 'Read',
            startValue: 0,
            targetValue: 10,
            categoryId: study,
        });

        await ownerIdentity.mutation(api.progress.createProgress, {
            objectiveId: run,
            updatedValue: 1,
            updateDate: Date.UTC(2026, 0, 2),
        });

        const list = async (filters: { status?: 'completed'; categoryId: string }) =>
            (
                await ownerIdentity.query(api.objectives.listObjectives, {
                    ...filters,
                    paginationOpts: page,
                })
            ).page.map(objective => objective.id);

        expect(await list({ categoryId: health })).toEqual([swim, run]);
        expect(await list({ categoryId: health, status: 'completed' })).toEqual([run]);
        expect(await list({ categoryId: 'not-an-id' })).toEqual([]);
    });

    test("filters by deadline relative to the user's day, soonest first @REQ-OBJETIVOS-009 @INH-OBJ-15", async () => {
        const today = Date.UTC(2026, 0, 10);
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(today - 12 * 60 * 60 * 1000);

        try {
            const health = await createCategory('Health');

            const createDue = (title: string, deadline?: number, categoryId?: Id<'categories'>) =>
                ownerIdentity.mutation(api.objectives.createObjective, {
                    title,
                    startValue: 0,
                    targetValue: 1,
                    deadline,
                    categoryId,
                });

            const overdue = await createDue('Overdue', today - TIME.DAY_MS);
            const dueToday = await createDue('Due today', today);
            const dueInWeek = await createDue('Due in five days', today + 5 * TIME.DAY_MS, health);
            const dueThisMonth = await createDue('Due this month', today + 15 * TIME.DAY_MS);
            await createDue('Due next month', Date.UTC(2026, 1, 2));
            await createDue('No deadline');
            const completedLate = await createDue('Completed late', today - TIME.DAY_MS);

            await ownerIdentity.mutation(api.progress.createProgress, {
                objectiveId: completedLate,
                updatedValue: 1,
                updateDate: today - TIME.DAY_MS,
            });

            const list = (
                filter: 'overdue' | 'today' | 'week' | 'month',
                extra: { status?: 'completed'; categoryId?: string; search?: string } = {},
                numItems = 20
            ) =>
                ownerIdentity.query(api.objectives.listObjectives, {
                    ...extra,
                    deadline: { filter, today },
                    paginationOpts: { numItems, cursor: null },
                });

            const ids = async (...args: Parameters<typeof list>) =>
                (await list(...args)).page.map(objective => objective.id);

            expect(await ids('overdue')).toEqual([overdue]);
            expect(await ids('today')).toEqual([dueToday]);
            expect(await ids('week')).toEqual([dueToday, dueInWeek]);
            expect(await ids('month')).toEqual([dueToday, dueInWeek, dueThisMonth]);
            expect(await ids('overdue', { status: 'completed' })).toEqual([]);
            expect(await ids('month', { categoryId: health })).toEqual([dueInWeek]);
            expect((await ids('week', { search: 'due' })).sort()).toEqual(
                [dueToday, dueInWeek].sort()
            );
            expect((await list('month', {}, 3)).isDone).toBe(true);
        } finally {
            vi.useRealTimers();
        }
    });

    test('assigns, changes and clears the category, only within the organization @REQ-OBJETIVOS-004', async () => {
        const other = await createUserInNewOrganization('objective-category');
        const health = await createCategory('Health');
        const study = await createCategory('Study');
        const foreign = await createCategory('Foreign', other.organization);

        const objectiveId = await ownerIdentity.mutation(api.objectives.createObjective, {
            title: 'Categorised',
            startValue: 0,
            targetValue: 5,
            categoryId: health,
        });

        expect(
            await ownerIdentity.mutation(api.objectives.updateObjective, {
                id: objectiveId,
                categoryId: study,
            })
        ).toMatchObject({ categoryId: study, categoryName: 'Study' });

        await expect(
            ownerIdentity.mutation(api.objectives.updateObjective, {
                id: objectiveId,
                categoryId: foreign,
            })
        ).rejects.toThrow('CATEGORY_NOT_FOUND');
        await expect(
            ownerIdentity.mutation(api.objectives.createObjective, {
                title: 'Foreign category',
                startValue: 0,
                targetValue: 5,
                categoryId: foreign,
            })
        ).rejects.toThrow('CATEGORY_NOT_FOUND');

        const cleared = await ownerIdentity.mutation(api.objectives.updateObjective, {
            id: objectiveId,
            categoryId: null,
        });

        expect(cleared.categoryId).toBeUndefined();
        expect(cleared.categoryName).toBeUndefined();
    });

    test('hides objectives from another organization @REQ-NF-003 @INH-ORG-04 @INH-OBJ-14', async () => {
        const outsider = await createUserInNewOrganization('objective-outsider');
        const objectiveId = await create('Private to org', { targetValue: 3 });

        expect(
            await asUser(outsider.user).query(api.objectives.getObjective, { id: objectiveId })
        ).toBeNull();
        await expect(
            asUser(outsider.user).mutation(api.objectives.updateObjective, {
                id: objectiveId,
                title: 'Stolen',
            })
        ).rejects.toThrow('OBJECTIVE_NOT_FOUND');
        await expect(
            asUser(outsider.user).query(api.progress.getProgressHistory, { objectiveId })
        ).rejects.toThrow('OBJECTIVE_NOT_FOUND');
    });
});
