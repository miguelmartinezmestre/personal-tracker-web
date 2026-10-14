import { beforeEach, describe, expect, test, vi } from 'vitest';
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

describe('objectives and progress', () => {
    const t = initConvexTest();
    const invalidValues = [
        ['negative', -1, 'VALUE_NEGATIVE'],
        ['NaN', Number.NaN, 'VALUE_NOT_FINITE'],
    ] as const;
    let owner: TestUserData;
    let ownerIdentity: ReturnType<typeof t.withIdentity>;
    let organizationId: Id<'organization'>;

    function asUser(user: TestUserData) {
        return t.withIdentity(identityFor(user));
    }

    beforeEach(async () => {
        const suffix = Math.random().toString(36).slice(2, 10);
        owner = await createTestUser(t, {
            userId: `objective-owner-${suffix}`,
            email: `objective-owner-${suffix}@example.com`,
            name: 'Objective owner',
            role: 'user',
        });
        organizationId = await createTestOrganization(t, {
            name: `Objectives ${suffix}`,
            slug: `objectives-${suffix}`,
        });
        await createTestMember(t, { organizationId, userId: owner.docId, role: 'owner' });
        ownerIdentity = asUser(owner);
    });

    test('creates an objective and lists it for the active organization', async () => {
        const objectiveId = await ownerIdentity.mutation(api.objectives.createObjective, {
            title: 'Run',
            startValue: 0,
            targetValue: 10,
            unit: 'km',
        });

        const listed = await ownerIdentity.query(api.objectives.listObjectives, {
            status: 'active',
            paginationOpts: { numItems: 20, cursor: null },
        });
        expect(listed.page.map(objective => objective.id)).toContain(objectiveId);
        expect(listed.page[0]?.progressPercent).toBe(0);
        expect(listed.page[0]?.canManage).toBe(true);
    });

    test.each(invalidValues)(
        'rejects %s starting values on create and update',
        async (_label, startValue, errorCode) => {
            const objectiveId = await ownerIdentity.mutation(api.objectives.createObjective, {
                title: 'Valid starting value',
                startValue: 2,
                targetValue: 10,
            });
            const before = await ownerIdentity.query(api.objectives.getObjective, {
                id: objectiveId,
            });

            await expect(
                ownerIdentity.mutation(api.objectives.createObjective, {
                    title: 'Invalid starting value',
                    startValue,
                    targetValue: 10,
                })
            ).rejects.toThrow(errorCode);
            await expect(
                ownerIdentity.mutation(api.objectives.updateObjective, {
                    id: objectiveId,
                    title: 'Rejected edit',
                    startValue,
                })
            ).rejects.toThrow(errorCode);

            expect(
                await ownerIdentity.query(api.objectives.getObjective, { id: objectiveId })
            ).toEqual(before);
            const listed = await ownerIdentity.query(api.objectives.listObjectives, {
                paginationOpts: { numItems: 20, cursor: null },
            });
            expect(listed.page.map(objective => objective.id)).toEqual([objectiveId]);
        }
    );

    test.each([
        ['zero', 0, 'TARGET_TOO_SMALL'],
        ['NaN', Number.NaN, 'TARGET_NOT_FINITE'],
    ] as const)(
        'rejects %s targets on create and update',
        async (_label, targetValue, errorCode) => {
            const objectiveId = await ownerIdentity.mutation(api.objectives.createObjective, {
                title: 'Valid target',
                startValue: 0,
                targetValue: 10,
            });
            await ownerIdentity.mutation(api.objectives.createProgress, {
                objectiveId,
                updatedValue: 3,
                updateDate: Date.UTC(2026, 0, 2),
            });
            const before = await ownerIdentity.query(api.objectives.getObjective, {
                id: objectiveId,
            });

            await expect(
                ownerIdentity.mutation(api.objectives.createObjective, {
                    title: 'Invalid target',
                    startValue: 0,
                    targetValue,
                })
            ).rejects.toThrow(errorCode);
            await expect(
                ownerIdentity.mutation(api.objectives.updateObjective, {
                    id: objectiveId,
                    title: 'Rejected edit',
                    targetValue,
                })
            ).rejects.toThrow(errorCode);

            expect(
                await ownerIdentity.query(api.objectives.getObjective, { id: objectiveId })
            ).toEqual(before);
            const listed = await ownerIdentity.query(api.objectives.listObjectives, {
                paginationOpts: { numItems: 20, cursor: null },
            });
            expect(listed.page.map(objective => objective.id)).toEqual([objectiveId]);
        }
    );

    test('keeps decimal totals free of floating-point drift', async () => {
        const objectiveId = await ownerIdentity.mutation(api.objectives.createObjective, {
            title: 'Decimal totals',
            startValue: 0,
            targetValue: 10,
        });
        const updateDate = Date.UTC(2026, 0, 2);
        const first = await ownerIdentity.mutation(api.objectives.createProgress, {
            objectiveId,
            updatedValue: 0.1,
            updateDate,
        });
        const second = await ownerIdentity.mutation(api.objectives.createProgress, {
            objectiveId,
            updatedValue: 0.2,
            updateDate,
        });
        expect(
            await ownerIdentity.query(api.objectives.getObjective, { id: objectiveId })
        ).toMatchObject({ currentValue: 0.3 });

        await ownerIdentity.mutation(api.objectives.createProgress, {
            objectiveId,
            updatedValue: 30,
            updateDate,
        });
        await ownerIdentity.mutation(api.objectives.updateObjective, {
            id: objectiveId,
            startValue: 5,
            targetValue: 50,
        });
        await ownerIdentity.mutation(api.objectives.updateProgress, {
            id: first.id,
            updatedValue: 0.7,
            updateDate,
        });
        expect(
            await ownerIdentity.query(api.objectives.getObjective, { id: objectiveId })
        ).toMatchObject({ currentValue: 35.9 });

        await ownerIdentity.mutation(api.objectives.deleteProgress, { id: second.id });
        expect(
            await ownerIdentity.query(api.objectives.getObjective, { id: objectiveId })
        ).toMatchObject({ currentValue: 35.7 });
        const history = await ownerIdentity.query(api.objectives.getProgressHistory, {
            objectiveId,
        });
        expect(history.points.map(point => point.value)).toEqual([5.7, 35.7]);
    });

    test('rejects progress dated in the future on create and update', async () => {
        const objectiveId = await ownerIdentity.mutation(api.objectives.createObjective, {
            title: 'No future progress',
            startValue: 0,
            targetValue: 10,
        });
        const today = new Date();
        const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
        const dayAfterTomorrow = todayUtc + 2 * 24 * 60 * 60 * 1000;
        const progress = await ownerIdentity.mutation(api.objectives.createProgress, {
            objectiveId,
            updatedValue: 2,
            updateDate: todayUtc,
        });
        const before = await ownerIdentity.query(api.objectives.getObjective, { id: objectiveId });

        await expect(
            ownerIdentity.mutation(api.objectives.createProgress, {
                objectiveId,
                updatedValue: 2,
                updateDate: dayAfterTomorrow,
            })
        ).rejects.toThrow('FUTURE_DATE_NOT_ALLOWED');
        await expect(
            ownerIdentity.mutation(api.objectives.updateProgress, {
                id: progress.id,
                updatedValue: 2,
                updateDate: dayAfterTomorrow,
            })
        ).rejects.toThrow('FUTURE_DATE_NOT_ALLOWED');

        expect(await ownerIdentity.query(api.objectives.getObjective, { id: objectiveId })).toEqual(
            before
        );
        const entries = await ownerIdentity.query(api.objectives.listProgress, {
            objectiveId,
            paginationOpts: { numItems: 20, cursor: null },
        });
        expect(entries.page.map(entry => entry.updateDate)).toEqual([todayUtc]);
    });

    test('paginates objectives within the active organization and status filter', async () => {
        const first = await ownerIdentity.mutation(api.objectives.createObjective, {
            title: 'First',
            startValue: 0,
            targetValue: 10,
        });
        const second = await ownerIdentity.mutation(api.objectives.createObjective, {
            title: 'Second',
            startValue: 0,
            targetValue: 10,
        });
        const completed = await ownerIdentity.mutation(api.objectives.createObjective, {
            title: 'Completed',
            startValue: 0,
            targetValue: 10,
        });
        await ownerIdentity.mutation(api.objectives.createProgress, {
            objectiveId: completed,
            updatedValue: 10,
            updateDate: Date.UTC(2026, 0, 2),
        });

        const page = await ownerIdentity.query(api.objectives.listObjectives, {
            status: 'active',
            paginationOpts: { numItems: 1, cursor: null },
        });
        expect(page.page).toHaveLength(1);
        expect(page.isDone).toBe(false);
        expect(page).not.toHaveProperty('needsContinuation');
        const next = await ownerIdentity.query(api.objectives.listObjectives, {
            status: 'active',
            paginationOpts: { numItems: 1, cursor: page.continueCursor },
        });
        expect(next.page).toHaveLength(1);
        expect([first, second]).toContain(next.page[0]?.id);
        expect(next.page[0]?.id).not.toBe(page.page[0]?.id);
    });

    test('a full last page reports isDone until a next page appears', async () => {
        for (const title of ['One', 'Two']) {
            await ownerIdentity.mutation(api.objectives.createObjective, {
                title,
                startValue: 0,
                targetValue: 10,
            });
        }
        const full = await ownerIdentity.query(api.objectives.listObjectives, {
            paginationOpts: { numItems: 2, cursor: null },
        });
        expect(full.page).toHaveLength(2);
        expect(full.isDone).toBe(true);

        // Newest first, so an older objective lands right after the page.
        await t.run(ctx =>
            ctx.db.insert('objectives', {
                organizationId,
                createdBy: owner.docId,
                title: 'Older',
                startValue: 0,
                currentValue: 0,
                targetValue: 10,
                status: 'active',
                createdAt: 1,
                updatedAt: 1,
            })
        );
        const again = await ownerIdentity.query(api.objectives.listObjectives, {
            paginationOpts: { numItems: 2, cursor: null },
        });
        expect(again.isDone).toBe(false);
        const last = await ownerIdentity.query(api.objectives.listObjectives, {
            paginationOpts: { numItems: 2, cursor: again.continueCursor },
        });
        expect(last.page.map(objective => objective.title)).toEqual(['Older']);
        expect(last.isDone).toBe(true);
    });

    test('does not expose another organization through a reused objective cursor', async () => {
        const cursorObjective = await ownerIdentity.mutation(api.objectives.createObjective, {
            title: 'Owner objective',
            startValue: 0,
            targetValue: 10,
        });
        await ownerIdentity.mutation(api.objectives.createObjective, {
            title: 'Owner second objective',
            startValue: 0,
            targetValue: 10,
        });
        const cursorPage = await ownerIdentity.query(api.objectives.listObjectives, {
            paginationOpts: { numItems: 1, cursor: null },
        });
        expect(cursorPage.page).toHaveLength(1);
        expect(cursorPage.isDone).toBe(false);
        expect([cursorObjective]).not.toContain(cursorPage.page[0]?.id);

        const suffix = Math.random().toString(36).slice(2, 10);
        const otherUser = await createTestUser(t, {
            userId: `objective-tenant-${suffix}`,
            email: `objective-tenant-${suffix}@example.com`,
            name: 'Other tenant',
            role: 'user',
        });
        const otherOrg = await createTestOrganization(t, {
            name: `Other tenant ${suffix}`,
            slug: `other-tenant-${suffix}`,
        });
        await createTestMember(t, {
            organizationId: otherOrg,
            userId: otherUser.docId,
            role: 'owner',
        });
        const otherIdentity = asUser(otherUser);
        const otherId = await otherIdentity.mutation(api.objectives.createObjective, {
            title: 'Other objective',
            startValue: 0,
            targetValue: 10,
        });
        const otherFirstPage = await otherIdentity.query(api.objectives.listObjectives, {
            paginationOpts: { numItems: 10, cursor: null },
        });
        expect(otherFirstPage.page.map(item => item.id)).toContain(otherId);
        const reused = await otherIdentity.query(api.objectives.listObjectives, {
            paginationOpts: { numItems: 10, cursor: cursorPage.continueCursor },
        });
        expect(reused.page.every(item => item.id === otherId)).toBe(true);
    });

    test('paginates progress entries and scopes reused cursors to the requested objective', async () => {
        const firstObjective = await ownerIdentity.mutation(api.objectives.createObjective, {
            title: 'First series',
            startValue: 0,
            targetValue: 10,
        });
        const secondObjective = await ownerIdentity.mutation(api.objectives.createObjective, {
            title: 'Second series',
            startValue: 0,
            targetValue: 10,
        });
        for (let index = 1; index <= 3; index += 1) {
            await ownerIdentity.mutation(api.objectives.createProgress, {
                objectiveId: firstObjective,
                updatedValue: index,
                updateDate: Date.UTC(2026, 0, index),
            });
        }
        await ownerIdentity.mutation(api.objectives.createProgress, {
            objectiveId: secondObjective,
            updatedValue: 1,
            updateDate: Date.UTC(2026, 0, 1),
        });

        const firstPage = await ownerIdentity.query(api.objectives.listProgress, {
            objectiveId: firstObjective,
            paginationOpts: { numItems: 1, cursor: null },
        });
        expect(firstPage.page).toHaveLength(1);
        expect(firstPage.isDone).toBe(false);
        expect(firstPage.page[0]?.objectiveId).toBe(firstObjective);
        const next = await ownerIdentity.query(api.objectives.listProgress, {
            objectiveId: firstObjective,
            paginationOpts: { numItems: 1, cursor: firstPage.continueCursor },
        });
        expect(next.page).toHaveLength(1);
        expect(next.page[0]?.objectiveId).toBe(firstObjective);

        const reused = await ownerIdentity.query(api.objectives.listProgress, {
            objectiveId: secondObjective,
            paginationOpts: { numItems: 10, cursor: firstPage.continueCursor },
        });
        expect(reused.page.every(entry => entry.objectiveId === secondObjective)).toBe(true);
    });

    test('returns the cumulative progress history in chronological order', async () => {
        const objectiveId = await ownerIdentity.mutation(api.objectives.createObjective, {
            title: 'History',
            startValue: 5,
            targetValue: 50,
        });
        for (const [day, increment, comment] of [
            [3, 4, undefined],
            [1, 2, 'first'],
            [2, 1.5, undefined],
        ] as const) {
            await ownerIdentity.mutation(api.objectives.createProgress, {
                objectiveId,
                updatedValue: increment,
                updateDate: Date.UTC(2026, 0, day),
                ...(comment ? { comment } : {}),
            });
        }

        const history = await ownerIdentity.query(api.objectives.getProgressHistory, {
            objectiveId,
        });

        expect(
            history.points.map(({ updateDate, value, delta, comment }) => ({
                updateDate,
                value,
                delta,
                comment,
            }))
        ).toEqual([
            { updateDate: Date.UTC(2026, 0, 1), value: 7, delta: 2, comment: 'first' },
            { updateDate: Date.UTC(2026, 0, 2), value: 8.5, delta: 1.5, comment: undefined },
            { updateDate: Date.UTC(2026, 0, 3), value: 12.5, delta: 4, comment: undefined },
        ]);
    });

    test('rejects a starting value equal to or above the target on create and update', async () => {
        for (const startValue of [5, 8]) {
            await expect(
                ownerIdentity.mutation(api.objectives.createObjective, {
                    title: 'Invalid range',
                    startValue,
                    targetValue: 5,
                })
            ).rejects.toThrow('START_AFTER_TARGET');
        }

        const objectiveId = await ownerIdentity.mutation(api.objectives.createObjective, {
            title: 'Valid range',
            startValue: 2,
            targetValue: 10,
        });
        const before = await ownerIdentity.query(api.objectives.getObjective, { id: objectiveId });
        await expect(
            ownerIdentity.mutation(api.objectives.updateObjective, {
                id: objectiveId,
                startValue: 10,
            })
        ).rejects.toThrow('START_AFTER_TARGET');
        await expect(
            ownerIdentity.mutation(api.objectives.updateObjective, {
                id: objectiveId,
                targetValue: 1,
            })
        ).rejects.toThrow('START_AFTER_TARGET');

        expect(await ownerIdentity.query(api.objectives.getObjective, { id: objectiveId })).toEqual(
            before
        );
    });

    test.each([...invalidValues, ['zero', 0, 'PROGRESS_NOT_POSITIVE']] as const)(
        'rejects %s progress values without changing entries or totals',
        async (_label, updatedValue, errorCode) => {
            const objectiveId = await ownerIdentity.mutation(api.objectives.createObjective, {
                title: 'Validated progress',
                startValue: 0,
                targetValue: 10,
            });
            const initial = await ownerIdentity.query(api.objectives.getObjective, {
                id: objectiveId,
            });
            await expect(
                ownerIdentity.mutation(api.objectives.createProgress, {
                    objectiveId,
                    updatedValue,
                    updateDate: Date.UTC(2026, 0, 2),
                })
            ).rejects.toThrow(errorCode);
            expect(
                await ownerIdentity.query(api.objectives.getObjective, { id: objectiveId })
            ).toEqual(initial);
            const emptyProgress = await ownerIdentity.query(api.objectives.listProgress, {
                objectiveId,
                paginationOpts: { numItems: 20, cursor: null },
            });
            expect(emptyProgress.page).toEqual([]);

            const progress = await ownerIdentity.mutation(api.objectives.createProgress, {
                objectiveId,
                updatedValue: 10,
                updateDate: Date.UTC(2026, 0, 2),
                comment: 'Completed',
            });
            const completed = await ownerIdentity.query(api.objectives.getObjective, {
                id: objectiveId,
            });
            const originalEntry = await t.run(ctx => ctx.db.get('progressUpdates', progress.id));
            await expect(
                ownerIdentity.mutation(api.objectives.updateProgress, {
                    id: progress.id,
                    updatedValue,
                    updateDate: Date.UTC(2026, 0, 3),
                    comment: 'Rejected edit',
                })
            ).rejects.toThrow(errorCode);
            expect(
                await ownerIdentity.query(api.objectives.getObjective, { id: objectiveId })
            ).toEqual(completed);
            expect(await t.run(ctx => ctx.db.get('progressUpdates', progress.id))).toEqual(
                originalEntry
            );
        }
    );

    test('progress completes the objective and deleting it reopens the objective', async () => {
        const objectiveId = await ownerIdentity.mutation(api.objectives.createObjective, {
            title: 'Read',
            startValue: 0,
            targetValue: 10,
        });
        const progress = await ownerIdentity.mutation(api.objectives.createProgress, {
            objectiveId,
            updatedValue: 10,
            updateDate: Date.UTC(2026, 0, 2),
            comment: 'Finished',
        });
        const completed = await ownerIdentity.query(api.objectives.getObjective, {
            id: objectiveId,
        });
        expect(completed?.status).toBe('completed');
        expect(completed?.currentValue).toBe(10);

        await expect(
            ownerIdentity.mutation(api.objectives.createProgress, {
                objectiveId,
                updatedValue: 1,
                updateDate: Date.UTC(2026, 0, 3),
            })
        ).rejects.toThrow('OBJECTIVE_ALREADY_COMPLETED');

        await ownerIdentity.mutation(api.objectives.deleteProgress, { id: progress.id });
        const reopened = await ownerIdentity.query(api.objectives.getObjective, {
            id: objectiveId,
        });
        expect(reopened?.status).toBe('active');
        expect(reopened?.currentValue).toBe(0);
    });

    test('editing progress and the target recalculates completion without changing the entry total', async () => {
        const objectiveId = await ownerIdentity.mutation(api.objectives.createObjective, {
            title: 'Adjustable',
            startValue: 2,
            targetValue: 10,
        });
        const progress = await ownerIdentity.mutation(api.objectives.createProgress, {
            objectiveId,
            updatedValue: 3,
            updateDate: Date.UTC(2026, 0, 2),
        });

        await ownerIdentity.mutation(api.objectives.updateProgress, {
            id: progress.id,
            updatedValue: 8,
            updateDate: Date.UTC(2026, 0, 2),
        });
        const completed = await ownerIdentity.query(api.objectives.getObjective, {
            id: objectiveId,
        });
        expect(completed).toMatchObject({ currentValue: 10, status: 'completed' });
        expect(completed?.completedAt).toBeDefined();

        const reopened = await ownerIdentity.mutation(api.objectives.updateObjective, {
            id: objectiveId,
            targetValue: 12,
        });
        expect(reopened).toMatchObject({ currentValue: 10, status: 'active', progressPercent: 80 });
        expect(reopened.completedAt).toBeUndefined();
    });

    test('rejects a new deadline in the past but keeps one that has already passed', async () => {
        const pastDeadline = Date.UTC(2020, 0, 1);
        await expect(
            ownerIdentity.mutation(api.objectives.createObjective, {
                title: 'Late',
                startValue: 0,
                targetValue: 10,
                deadline: pastDeadline,
            })
        ).rejects.toThrow('DEADLINE_TOO_OLD');

        const objectiveId = await ownerIdentity.mutation(api.objectives.createObjective, {
            title: 'Overdue',
            startValue: 0,
            targetValue: 10,
        });
        await expect(
            ownerIdentity.mutation(api.objectives.updateObjective, {
                id: objectiveId,
                deadline: pastDeadline,
            })
        ).rejects.toThrow('DEADLINE_TOO_OLD');

        // The deadline passed while the objective was still open.
        await t.run(ctx => ctx.db.patch('objectives', objectiveId, { deadline: pastDeadline }));
        const renamed = await ownerIdentity.mutation(api.objectives.updateObjective, {
            id: objectiveId,
            title: 'Overdue, renamed',
            deadline: pastDeadline,
        });
        expect(renamed).toMatchObject({ title: 'Overdue, renamed', deadline: pastDeadline });
    });

    test('preserves recorded progress when the starting value changes', async () => {
        const objectiveId = await ownerIdentity.mutation(api.objectives.createObjective, {
            title: 'Changing baseline',
            startValue: 2,
            targetValue: 10,
        });
        const progress = await ownerIdentity.mutation(api.objectives.createProgress, {
            objectiveId,
            updatedValue: 3,
            updateDate: Date.UTC(2026, 0, 2),
        });

        expect(
            await ownerIdentity.mutation(api.objectives.updateObjective, {
                id: objectiveId,
                startValue: 4,
            })
        ).toMatchObject({ startValue: 4, currentValue: 7, status: 'active' });
        const completed = await ownerIdentity.mutation(api.objectives.updateObjective, {
            id: objectiveId,
            startValue: 7,
        });
        expect(completed).toMatchObject({ currentValue: 10, status: 'completed' });
        expect(completed.completedAt).toBeDefined();
        const reopened = await ownerIdentity.mutation(api.objectives.updateObjective, {
            id: objectiveId,
            startValue: 1,
        });
        expect(reopened).toMatchObject({ currentValue: 4, status: 'active' });
        expect(reopened.completedAt).toBeUndefined();

        await ownerIdentity.mutation(api.objectives.deleteProgress, { id: progress.id });
        expect(
            await ownerIdentity.query(api.objectives.getObjective, { id: objectiveId })
        ).toMatchObject({ startValue: 1, currentValue: 1, progressPercent: 0 });
    });

    test('rejects objective changes from a member and allows an admin', async () => {
        const suffix = Math.random().toString(36).slice(2, 10);
        const member = await createTestUser(t, {
            userId: `objective-member-${suffix}`,
            email: `objective-member-${suffix}@example.com`,
            name: 'Member',
            role: 'user',
        });
        const admin = await createTestUser(t, {
            userId: `objective-admin-${suffix}`,
            email: `objective-admin-${suffix}@example.com`,
            name: 'Admin',
            role: 'user',
        });
        await createTestMember(t, { organizationId, userId: member.docId, role: 'member' });
        await createTestMember(t, { organizationId, userId: admin.docId, role: 'admin' });
        const objectiveId = await ownerIdentity.mutation(api.objectives.createObjective, {
            title: 'Shared',
            startValue: 0,
            targetValue: 4,
        });

        await expect(
            asUser(member).mutation(api.objectives.updateObjective, {
                id: objectiveId,
                title: 'Nope',
            })
        ).rejects.toThrow('NOT_AUTHORIZED_OBJECTIVE');

        const progress = await asUser(member).mutation(api.objectives.createProgress, {
            objectiveId,
            updatedValue: 1,
            updateDate: Date.UTC(2026, 0, 4),
        });
        expect(progress.canEdit).toBe(true);

        const updated = await asUser(admin).mutation(api.objectives.updateObjective, {
            id: objectiveId,
            title: 'Shared title',
        });
        expect(updated.title).toBe('Shared title');
    });

    test('hides objectives from another organization', async () => {
        const suffix = Math.random().toString(36).slice(2, 10);
        const outsider = await createTestUser(t, {
            userId: `objective-outsider-${suffix}`,
            email: `objective-outsider-${suffix}@example.com`,
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
        const objectiveId = await ownerIdentity.mutation(api.objectives.createObjective, {
            title: 'Private to org',
            startValue: 0,
            targetValue: 3,
        });

        expect(
            await asUser(outsider).query(api.objectives.getObjective, { id: objectiveId })
        ).toBeNull();
        await expect(
            asUser(outsider).mutation(api.objectives.updateObjective, {
                id: objectiveId,
                title: 'Stolen',
            })
        ).rejects.toThrow('OBJECTIVE_NOT_FOUND');
        await expect(
            asUser(outsider).query(api.objectives.getProgressHistory, { objectiveId })
        ).rejects.toThrow('OBJECTIVE_NOT_FOUND');
    });

    test('deletes the objective and its progress', async () => {
        const objectiveId = await ownerIdentity.mutation(api.objectives.createObjective, {
            title: 'Temporary',
            startValue: 0,
            targetValue: 20,
        });
        const progress = await ownerIdentity.mutation(api.objectives.createProgress, {
            objectiveId,
            updatedValue: 2,
            updateDate: Date.UTC(2026, 0, 5),
        });
        await ownerIdentity.mutation(api.objectives.deleteObjective, { id: objectiveId });

        expect(
            await ownerIdentity.query(api.objectives.getObjective, { id: objectiveId })
        ).toBeNull();
        await t.run(async ctx => {
            expect(await ctx.db.get('progressUpdates', progress.id)).toBeNull();
            expect(await ctx.db.get('objectives', objectiveId)).toBeNull();
        });
    });

    test('continues deleting when progress exceeds one batch', async () => {
        const now = Date.now();
        vi.useFakeTimers();
        vi.setSystemTime(now);
        try {
            const objectiveId = await ownerIdentity.mutation(api.objectives.createObjective, {
                title: 'Long series',
                startValue: 0,
                targetValue: 1000,
            });
            const updateDate = Date.UTC(
                new Date(now).getUTCFullYear(),
                new Date(now).getUTCMonth(),
                new Date(now).getUTCDate()
            );
            for (let index = 0; index < 51; index += 1) {
                await ownerIdentity.mutation(api.objectives.createProgress, {
                    objectiveId,
                    updatedValue: 1,
                    updateDate,
                });
            }
            await ownerIdentity.mutation(api.objectives.deleteObjective, { id: objectiveId });
            await t.finishAllScheduledFunctions(() => vi.runAllTimers());
            expect(
                await ownerIdentity.query(api.objectives.getObjective, { id: objectiveId })
            ).toBeNull();
        } finally {
            vi.useRealTimers();
        }
    });
});
