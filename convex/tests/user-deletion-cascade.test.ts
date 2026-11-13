import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { internal } from '../_generated/api';
import { runInAuth } from './authTesting';
import { initConvexTest } from './test.helper';
import { createTestMember, createTestOrganization, createTestUser } from './test.helpers';

describe('user deletion cascade', () => {
    const t = initConvexTest();

    beforeEach(() => vi.useFakeTimers());
    afterEach(async () => {
        await t.finishAllScheduledFunctions(() => vi.runAllTimers());
        vi.clearAllTimers();
        vi.useRealTimers();
    });

    test('deletes the personal organization and those left empty, and keeps shared work @REQ-AUTENTICACION-009', async () => {
        const suffix = Math.random().toString(36).slice(2, 10);

        const createUser = (label: string) =>
            createTestUser(t, {
                userId: `${label}-${suffix}`,
                email: `${label}-${suffix}@example.com`,
                name: label,
            });

        const deleted = await createUser('deleted');
        const otherOwner = await createUser('other-owner');

        const create = (name: string, description?: string) =>
            createTestOrganization(t, {
                name: `${name} ${suffix}`,
                slug: `${name}-${suffix}`,
                description,
            });

        const shared = await create('shared');
        const alone = await create('alone');

        const personal = await create(
            'personal',
            JSON.stringify({ type: 'personal', ownerUserId: deleted.docId })
        );

        await createTestMember(t, { organizationId: shared, userId: deleted.docId, role: 'owner' });
        await createTestMember(t, {
            organizationId: shared,
            userId: otherOwner.docId,
            role: 'owner',
        });
        await createTestMember(t, { organizationId: alone, userId: deleted.docId, role: 'owner' });
        await createTestMember(t, {
            organizationId: personal,
            userId: deleted.docId,
            role: 'owner',
        });

        const sharedObjective = await t.run(async ctx => {
            const objectiveId = await ctx.db.insert('objectives', {
                organizationId: shared,
                createdBy: deleted.docId,
                title: 'Shared work',
                direction: 'increase',
                memberCanView: true,
                memberCanEdit: false,
                startValue: 0,
                currentValue: 0,
                targetValue: 5,
                status: 'active',
                createdAt: 1,
                updatedAt: 1,
            });

            await ctx.db.insert('objectivePermissions', {
                objectiveId,
                organizationId: shared,
                userId: deleted.docId,
                canEdit: true,
                addedBy: otherOwner.docId,
                createdAt: 1,
                updatedAt: 1,
            });

            return objectiveId;
        });

        await t.mutation(internal.cascades.cascadeUserDeletionInternal, { userId: deleted.docId });
        await t.finishAllScheduledFunctions(() => vi.runAllTimers());

        await runInAuth(t, async ctx => {
            expect(await ctx.db.get('organization', personal)).toBeNull();
            expect(await ctx.db.get('organization', alone)).toBeNull();
            expect(await ctx.db.get('organization', shared)).not.toBeNull();
            expect(
                await ctx.db
                    .query('member')
                    .withIndex('userId', q => q.eq('userId', deleted.docId))
                    .first()
            ).toBeNull();
            expect(await ctx.db.get('user', deleted.docId)).toMatchObject({ name: 'deleted' });
        });

        await t.run(async ctx => {
            expect(await ctx.db.get('objectives', sharedObjective)).toMatchObject({
                createdBy: deleted.docId,
            });
            expect(
                await ctx.db
                    .query('objectivePermissions')
                    .withIndex('by_user_organization', q => q.eq('userId', deleted.docId))
                    .first()
            ).toBeNull();
        });
    });
});
