import { describe, expect, test } from 'vitest';
import { initConvexTest } from './test.helper';
import {
    createTestMember,
    createTestObjective,
    createTestOrganization,
    createTestUser,
} from './test_helpers';
import { cascadeUserDeletion } from '../domain/objectives/collaborators';

describe('cascadeUserDeletion (F7)', () => {
    const t = initConvexTest({ workflow: false });

    test('reassigns owned objectives to a successor and tombstones the rest', async () => {
        const suffix = Math.random().toString(36).slice(2, 10);

        const orgWithSuccessor = await createTestOrganization(t, {
            name: `Team Org ${suffix}`,
            slug: `team-org-${suffix}`,
        });
        const soloOrg = await createTestOrganization(t, {
            name: `Solo Org ${suffix}`,
            slug: `solo-org-${suffix}`,
        });

        const owner = await createTestUser(t, {
            userId: `owner-${suffix}`,
            email: `owner-${suffix}@example.com`,
            name: 'Owner',
        });
        const editor = await createTestUser(t, {
            userId: `editor-${suffix}`,
            email: `editor-${suffix}@example.com`,
            name: 'Editor',
        });

        await createTestMember(t, {
            organizationId: orgWithSuccessor,
            userId: owner.docId,
            role: 'owner',
        });
        await createTestMember(t, {
            organizationId: orgWithSuccessor,
            userId: editor.docId,
            role: 'member',
        });
        await createTestMember(t, { organizationId: soloOrg, userId: owner.docId, role: 'owner' });

        const reassignable = await createTestObjective(t, {
            userId: owner.docId,
            organizationId: orgWithSuccessor,
            title: 'Reassignable',
            targetValue: 100,
            currentValue: 0,
            visibility: 'organization',
        });
        const orphan = await createTestObjective(t, {
            userId: owner.docId,
            organizationId: soloOrg,
            title: 'Orphan',
            targetValue: 100,
            currentValue: 0,
            visibility: 'private',
        });

        await t.run(async ctx => {
            await ctx.db.insert('objectiveCollaborators', {
                objectiveId: reassignable,
                userId: editor.docId,
                organizationId: orgWithSuccessor,
                role: 'editor',
                addedBy: owner.docId,
                createdAt: Date.now(),
            });
        });

        await t.run(async ctx => cascadeUserDeletion(ctx, owner.docId));

        const { reassignedObjective, orphanObjective, remainingCollaborators } = await t.run(
            async ctx => ({
                reassignedObjective: await ctx.db.get('objectives', reassignable),
                orphanObjective: await ctx.db.get('objectives', orphan),
                remainingCollaborators: await ctx.db
                    .query('objectiveCollaborators')
                    .withIndex('by_objective', q => q.eq('objectiveId', reassignable))
                    .collect(),
            })
        );

        // Objective with an editor collaborator is handed over to that editor.
        expect(reassignedObjective?.ownerId).toBe(editor.docId);
        expect(reassignedObjective?.deletedAt).toBeUndefined();
        // The promoted editor's collaborator row is removed (they are now owner).
        expect(remainingCollaborators).toHaveLength(0);
        // Objective with no possible successor is tombstoned, not left orphaned.
        expect(orphanObjective?.deletedAt).toBeDefined();
        expect(orphanObjective?.deletedBy).toBe(owner.docId);
    });

    test('removes collaborator rows beyond one cascade batch', async () => {
        const suffix = Math.random().toString(36).slice(2, 10);

        const organizationId = await createTestOrganization(t, {
            name: `Batch Org ${suffix}`,
            slug: `batch-org-${suffix}`,
        });
        const owner = await createTestUser(t, {
            userId: `batch-owner-${suffix}`,
            email: `batch-owner-${suffix}@example.com`,
            name: 'Batch Owner',
        });
        const departing = await createTestUser(t, {
            userId: `batch-departing-${suffix}`,
            email: `batch-departing-${suffix}@example.com`,
            name: 'Departing User',
        });

        await createTestMember(t, { organizationId, userId: owner.docId, role: 'owner' });
        await createTestMember(t, {
            organizationId,
            userId: departing.docId,
            role: 'member',
        });

        const objectiveId = await createTestObjective(t, {
            userId: owner.docId,
            organizationId,
            title: 'Batch collaborator cleanup',
            targetValue: 100,
            currentValue: 0,
            visibility: 'private',
        });

        await t.run(async ctx => {
            for (let i = 0; i < 1001; i++) {
                await ctx.db.insert('objectiveCollaborators', {
                    objectiveId,
                    userId: departing.docId,
                    organizationId,
                    role: 'viewer',
                    addedBy: owner.docId,
                    createdAt: Date.now() + i,
                });
            }
        });

        await t.run(async ctx => cascadeUserDeletion(ctx, departing.docId));

        const remaining = await t.run(async ctx => {
            const collaborators = await ctx.db
                .query('objectiveCollaborators')
                .withIndex('by_user', q => q.eq('userId', departing.docId))
                .collect();
            const memberships = await ctx.db
                .query('member')
                .withIndex('userId', q => q.eq('userId', departing.docId))
                .collect();
            return { collaborators, memberships };
        });

        expect(remaining.collaborators).toHaveLength(0);
        expect(remaining.memberships).toHaveLength(0);
    });
});
