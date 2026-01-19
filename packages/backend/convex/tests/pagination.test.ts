import { convexTest } from 'convex-test';
import { describe, expect, test, beforeEach } from 'vitest';
import { api } from '../_generated/api';
import schema from '../schema';
import { modules } from '../../test.setup';
import { createTestUser } from '../../test_helpers';
import { register } from '../../better-auth.helper';

const createObjective = async (t: ReturnType<typeof convexTest>, title: string) => {
    const userIdentity = t.withIdentity({ subject: 'pagination-user', role: 'admin' });
    return await userIdentity.mutation(api.objectives.createObjective, {
        title,
        targetValue: 100,
        currentValue: 10,
        status: 'in_progress',
    });
};

describe('convex pagination', () => {
    let t: ReturnType<typeof convexTest>;

    beforeEach(async () => {
        t = convexTest(schema, modules);
        register(t);
        await createTestUser(t as unknown as Parameters<typeof createTestUser>[0], {
            userId: 'pagination-user',
            email: 'pagination@example.com',
            name: 'Pagination User',
            role: 'admin',
            emailVerified: true,
        });
    });

    test('getObjectivesByUser paginates', async () => {
        const userIdentity = t.withIdentity({ subject: 'pagination-user', role: 'admin' });

        for (let i = 0; i < 15; i++) {
            await userIdentity.mutation(api.objectives.createObjective, {
                title: `Objective ${i}`,
                targetValue: 100,
                currentValue: 10,
                status: 'in_progress',
            });
        }

        const page1 = await userIdentity.query(api.objectives.getObjectivesByUser, {
            paginationOpts: { numItems: 5, cursor: null },
        });
        const page2 = await userIdentity.query(api.objectives.getObjectivesByUser, {
            paginationOpts: { numItems: 5, cursor: page1.continueCursor },
        });

        expect(page1.page.length).toBe(5);
        expect(page2.page.length).toBe(5);
        expect(page1.continueCursor).not.toBeNull();
    });

    test('getUpdateProgressByObjectiveId paginates', async () => {
        const userIdentity = t.withIdentity({ subject: 'pagination-user', role: 'admin' });
        const objectiveId = await createObjective(t, 'Pagination Objective');

        for (let i = 0; i < 12; i++) {
            await userIdentity.mutation(api.update_progress.createUpdateProgress, {
                objective: objectiveId,
                updatedValue: i + 1,
                updateDate: Date.now() + i * 1000,
            });
        }

        const page1 = await userIdentity.query(api.update_progress.getUpdateProgressByObjectiveId, {
            objectiveId,
            paginationOpts: { numItems: 5, cursor: null },
        });
        const page2 = await userIdentity.query(api.update_progress.getUpdateProgressByObjectiveId, {
            objectiveId,
            paginationOpts: { numItems: 5, cursor: page1.continueCursor },
        });

        expect(page1.page.length).toBe(5);
        expect(page2.page.length).toBe(5);
        expect(page1.continueCursor).not.toBeNull();
    });

    test('getNotificationsByUser paginates', async () => {
        const userIdentity = t.withIdentity({ subject: 'pagination-user', role: 'admin' });
        const objectiveId = await createObjective(t, 'Notifications Objective');

        for (let i = 0; i < 12; i++) {
            await userIdentity.mutation(api.notifications.createNotification, {
                objective: objectiveId,
                notificationType: 'reminder',
                message: `Notification ${i}`,
            });
        }

        const page1 = await userIdentity.query(api.notifications.getNotificationsByUser, {
            paginationOpts: { numItems: 5, cursor: null },
        });
        const page2 = await userIdentity.query(api.notifications.getNotificationsByUser, {
            paginationOpts: { numItems: 5, cursor: page1.continueCursor },
        });

        expect(page1.page.length).toBe(5);
        expect(page2.page.length).toBe(5);
        expect(page1.continueCursor).not.toBeNull();
    });
});
