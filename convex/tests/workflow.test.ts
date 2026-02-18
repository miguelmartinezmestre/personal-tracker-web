import { describe, test, expect, beforeEach } from 'vitest';
import { internal } from '../_generated/api';
import { initConvexTest } from './test.helper';
import { createTestUser, createTestOrganization, createTestMember } from './test_helpers';
import { TestConvexForDataModel } from 'convex-test';
import { DataModel } from '../_generated/dataModel';
import { isTerminalStatus } from '../objectiveWorkflow';

describe('objective workflow helpers', () => {
    describe('isTerminalStatus', () => {
        test('returns true for terminal statuses', () => {
            expect(isTerminalStatus('completed')).toBe(true);
            expect(isTerminalStatus('archived')).toBe(true);
            expect(isTerminalStatus('deleted')).toBe(true);
        });

        test('returns false for non-terminal statuses', () => {
            expect(isTerminalStatus('active')).toBe(false);
            expect(isTerminalStatus('paused')).toBe(false);
        });
    });
});

describe('objective steps', async () => {
    const t = initConvexTest();
    let userIdentity: TestConvexForDataModel<DataModel>;
    let userId: string;
    let organizationId: string;

    beforeEach(async () => {
        const randomSuffix = Math.random().toString(36).substring(2, 15);

        const user = {
            userId: 'test-user-workflow-' + randomSuffix,
            email: 'workflow-test@example.com-' + randomSuffix,
            name: 'Workflow Test User ' + randomSuffix,
            password: 'test-password',
            role: 'admin',
            emailVerified: false,
        };

        await createTestUser(t, user);
        userId = user.userId;

        const orgId = await createTestOrganization(t, {
            name: 'Workflow Test Org ' + randomSuffix,
            slug: 'workflow-test-org-' + randomSuffix,
        });
        organizationId = String(orgId);

        await createTestMember(t, {
            userId: user.userId,
            organizationId,
            role: 'owner',
        });

        userIdentity = t.withIdentity({ subject: user.userId, name: user.name });
    });

    describe('checkAutoComplete step', () => {
        test('returns already_completed for completed objective', async () => {
            const objectiveId = await userIdentity.run(async ctx => {
                return await ctx.db.insert('objectives', {
                    userId,
                    organizationId,
                    title: 'Completed Objective',
                    targetValue: 100,
                    currentValue: 100,
                    status: 'completed',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            const result = await t.mutation(internal.steps.objectives.checkAutoComplete, {
                objectiveId,
            });

            expect(result).toEqual({ status: 'already_completed', shouldComplete: false });
        });

        test('auto-completes when target reached (increase direction)', async () => {
            const objectiveId = await userIdentity.run(async ctx => {
                return await ctx.db.insert('objectives', {
                    userId,
                    organizationId,
                    title: 'Auto-complete Test',
                    targetValue: 100,
                    currentValue: 100,
                    status: 'active',
                    direction: 'increase',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            const result = await t.mutation(internal.steps.objectives.checkAutoComplete, {
                objectiveId,
            });

            expect(result.status).toBe('completed');
            expect(result.shouldComplete).toBe(true);

            const objective = await userIdentity.run(async ctx => ctx.db.get(objectiveId));
            expect(objective?.status).toBe('completed');
        });

        test('auto-completes when target reached (decrease direction)', async () => {
            const objectiveId = await userIdentity.run(async ctx => {
                return await ctx.db.insert('objectives', {
                    userId,
                    organizationId,
                    title: 'Decrease Objective',
                    targetValue: 10,
                    currentValue: 5,
                    status: 'active',
                    direction: 'decrease',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            const result = await t.mutation(internal.steps.objectives.checkAutoComplete, {
                objectiveId,
            });

            expect(result.status).toBe('completed');
            expect(result.shouldComplete).toBe(true);
        });

        test('does not auto-complete when target not reached', async () => {
            const objectiveId = await userIdentity.run(async ctx => {
                return await ctx.db.insert('objectives', {
                    userId,
                    organizationId,
                    title: 'In Progress Objective',
                    targetValue: 100,
                    currentValue: 50,
                    status: 'active',
                    direction: 'increase',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            const result = await t.mutation(internal.steps.objectives.checkAutoComplete, {
                objectiveId,
            });

            expect(result.status).toBe('active');
            expect(result.shouldComplete).toBe(false);

            const objective = await userIdentity.run(async ctx => ctx.db.get(objectiveId));
            expect(objective?.status).toBe('active');
        });

        test('creates notification on auto-complete', async () => {
            const objectiveId = await userIdentity.run(async ctx => {
                return await ctx.db.insert('objectives', {
                    userId,
                    organizationId,
                    title: 'Notification Test',
                    targetValue: 100,
                    currentValue: 100,
                    status: 'active',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            await t.mutation(internal.steps.objectives.checkAutoComplete, {
                objectiveId,
            });

            const notifications = await userIdentity.run(async ctx => {
                return await ctx.db
                    .query('notifications')
                    .withIndex('by_objective', q => q.eq('objective', objectiveId))
                    .collect();
            });

            expect(notifications.length).toBe(1);
            expect(notifications[0]?.notificationType).toBe('status');
            expect(notifications[0]?.message).toContain('completed');
        });
    });

    describe('sendReminder step', () => {
        test('returns not_active for paused objective', async () => {
            const objectiveId = await userIdentity.run(async ctx => {
                return await ctx.db.insert('objectives', {
                    userId,
                    organizationId,
                    title: 'Paused Objective',
                    targetValue: 100,
                    currentValue: 50,
                    status: 'paused',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            const result = await t.mutation(internal.steps.objectives.sendReminder, {
                objectiveId,
                reminderType: 'weekly_check',
            });

            expect(result).toEqual({ sent: false, reason: 'not_active' });
        });

        test('sends reminder for active objective', async () => {
            const objectiveId = await userIdentity.run(async ctx => {
                return await ctx.db.insert('objectives', {
                    userId,
                    organizationId,
                    title: 'Active Objective',
                    targetValue: 100,
                    currentValue: 50,
                    status: 'active',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            const result = await t.mutation(internal.steps.objectives.sendReminder, {
                objectiveId,
                reminderType: 'weekly_check',
            });

            expect(result.sent).toBe(true);

            const notifications = await userIdentity.run(async ctx => {
                return await ctx.db
                    .query('notifications')
                    .withIndex('by_objective', q => q.eq('objective', objectiveId))
                    .collect();
            });

            expect(notifications.length).toBe(1);
            expect(notifications[0]?.notificationType).toBe('reminder');
        });
    });
});
