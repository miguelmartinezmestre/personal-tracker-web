import { describe, expect, test, vi } from 'vitest';
import { api } from '../_generated/api';
import { initConvexTest } from './test.helper';
import {
    createTestMember,
    createTestOrganization,
    createTestUser,
    createTestObjective,
} from './test_helpers';
import { identityFor } from './test_identities';
import { domainTriggers } from '../platform/db/domainTriggers';

describe('dashboard visibility', () => {
    const t = initConvexTest();

    test('updates private grants without leaking counts or double-counting shared objectives', async () => {
        vi.useFakeTimers();
        try {
            const organizationId = await createTestOrganization(t, {
                name: 'Visibility',
                slug: 'dashboard-visibility',
            });
            const owner = await createTestUser(t, {
                userId: 'visibility-a',
                email: 'visibility-a@example.test',
                name: 'A',
            });
            const reader = await createTestUser(t, {
                userId: 'visibility-b',
                email: 'visibility-b@example.test',
                name: 'B',
            });
            await createTestMember(t, { organizationId, userId: owner.docId, role: 'member' });
            await createTestMember(t, { organizationId, userId: reader.docId, role: 'member' });
            const a = t.withIdentity(identityFor(owner));
            const b = t.withIdentity(identityFor(reader));
            const objectiveId = await createTestObjective(t, {
                userId: owner.docId,
                organizationId,
                title: 'Private',
                targetValue: 100,
                startValue: 0,
                visibility: 'private',
            });
            await expect(b.query(api.dashboard.getDashboardStats, {})).resolves.toEqual({
                completedObjectives: 0,
                pendingObjectives: 0,
            });
            const collaborator = await a.mutation(api.objectives.addCollaborator, {
                objectiveId,
                userId: reader.docId,
                role: 'editor',
            });
            expect(collaborator).not.toBeNull();
            await expect(b.query(api.dashboard.getDashboardStats, {})).resolves.toEqual({
                completedObjectives: 0,
                pendingObjectives: 1,
            });
            await t.run(async ctx => {
                await domainTriggers.wrapDB(ctx).db.insert('progressUpdates', {
                    objective: objectiveId,
                    organizationId,
                    createdBy: reader.docId,
                    updatedValue: 10,
                    updateDate: Date.now(),
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });
            await a.mutation(api.objectives.setObjectiveVisibility, {
                id: objectiveId,
                visibility: 'organization',
            });
            await t.finishAllScheduledFunctions(() => {
                vi.runAllTimers();
            });
            await expect(b.query(api.dashboard.getDashboardStats, {})).resolves.toEqual({
                completedObjectives: 0,
                pendingObjectives: 1,
            });
            await a.mutation(api.objectives.setObjectiveVisibility, {
                id: objectiveId,
                visibility: 'private',
            });
            if (!collaborator) {
                throw new Error('Collaborator was not created');
            }
            await a.mutation(api.objectives.removeCollaborator, {
                collaboratorId: collaborator._id,
            });
            await expect(
                b.query(api.dashboard.getMonthlyProgress, { now: Date.now() })
            ).rejects.toThrow('DASHBOARD_UPDATING');
            await t.finishAllScheduledFunctions(() => {
                vi.runAllTimers();
            });
            await expect(b.query(api.dashboard.getDashboardStats, {})).resolves.toEqual({
                completedObjectives: 0,
                pendingObjectives: 0,
            });
            const monthly = await b.query(api.dashboard.getMonthlyProgress, { now: Date.now() });
            expect(monthly.items.reduce((sum, item) => sum + item.count, 0)).toBe(0);
        } finally {
            vi.useRealTimers();
        }
    });
});
