import { beforeEach, describe, expect, test } from 'vitest';
import { api } from '../_generated/api';
import { initConvexTest } from './test.helper';
import {
    createTestCollaborator,
    createTestMember,
    createTestObjective,
    createTestOrganization,
    createTestUser,
} from './test_helpers';
import { identityFor } from './test_identities';
import type { DataModel, Id } from '../_generated/dataModel';
import type { TestConvexForDataModel } from 'convex-test';

describe('objective layered permissions integration', () => {
    const t = initConvexTest();

    let organizationId: Id<'organization'>;
    let ownerUser: Awaited<ReturnType<typeof createTestUser>>;
    let editorUser: Awaited<ReturnType<typeof createTestUser>>;
    let viewerUser: Awaited<ReturnType<typeof createTestUser>>;
    let outsiderUser: Awaited<ReturnType<typeof createTestUser>>;
    let adminUser: Awaited<ReturnType<typeof createTestUser>>;
    let ownerIdentity: TestConvexForDataModel<DataModel>;
    let editorIdentity: TestConvexForDataModel<DataModel>;
    let viewerIdentity: TestConvexForDataModel<DataModel>;
    let outsiderIdentity: TestConvexForDataModel<DataModel>;
    let adminIdentity: TestConvexForDataModel<DataModel>;
    let privateObjectiveId: Id<'objectives'>;
    let orgWideObjectiveId: Id<'objectives'>;

    beforeEach(async () => {
        const suffix = Math.random().toString(36).slice(2, 12);

        organizationId = await createTestOrganization(t, {
            name: `Layered Org ${suffix}`,
            slug: `layered-org-${suffix}`,
        });

        ownerUser = await createTestUser(t, {
            userId: `layer-owner-${suffix}`,
            email: `layer-owner-${suffix}@example.com`,
            name: 'Owner',
        });
        editorUser = await createTestUser(t, {
            userId: `layer-editor-${suffix}`,
            email: `layer-editor-${suffix}@example.com`,
            name: 'Editor',
        });
        viewerUser = await createTestUser(t, {
            userId: `layer-viewer-${suffix}`,
            email: `layer-viewer-${suffix}@example.com`,
            name: 'Viewer',
        });
        outsiderUser = await createTestUser(t, {
            userId: `layer-outsider-${suffix}`,
            email: `layer-outsider-${suffix}@example.com`,
            name: 'Outsider',
        });
        adminUser = await createTestUser(t, {
            userId: `layer-admin-${suffix}`,
            email: `layer-admin-${suffix}@example.com`,
            name: 'Admin',
        });

        await createTestMember(t, {
            organizationId,
            userId: ownerUser.docId,
            role: 'member',
        });
        await createTestMember(t, {
            organizationId,
            userId: editorUser.docId,
            role: 'member',
        });
        await createTestMember(t, {
            organizationId,
            userId: viewerUser.docId,
            role: 'member',
        });
        await createTestMember(t, {
            organizationId,
            userId: outsiderUser.docId,
            role: 'member',
        });
        await createTestMember(t, {
            organizationId,
            userId: adminUser.docId,
            role: 'admin',
        });

        ownerIdentity = t.withIdentity(identityFor(ownerUser));
        editorIdentity = t.withIdentity(identityFor(editorUser));
        viewerIdentity = t.withIdentity(identityFor(viewerUser));
        outsiderIdentity = t.withIdentity(identityFor(outsiderUser));
        adminIdentity = t.withIdentity(identityFor(adminUser));

        privateObjectiveId = await createTestObjective(t, {
            userId: ownerUser.docId,
            ownerId: ownerUser.docId,
            organizationId,
            title: 'Private objective',
            targetValue: 100,
            visibility: 'private',
        });
        orgWideObjectiveId = await createTestObjective(t, {
            userId: ownerUser.docId,
            ownerId: ownerUser.docId,
            organizationId,
            title: 'Org-wide objective',
            targetValue: 50,
            visibility: 'organization',
        });

        await createTestCollaborator(t, {
            objectiveId: privateObjectiveId,
            userId: editorUser.docId,
            organizationId,
            addedBy: ownerUser.docId,
            role: 'editor',
        });
        await createTestCollaborator(t, {
            objectiveId: privateObjectiveId,
            userId: viewerUser.docId,
            organizationId,
            addedBy: ownerUser.docId,
            role: 'viewer',
        });
    });

    test('outsider cannot view private objective', async () => {
        const objective = await outsiderIdentity.query(api.objectives.getObjectiveById, {
            id: privateObjectiveId,
        });
        expect(objective).toBeNull();
    });

    test('outsider can view organization-wide objective but not contribute', async () => {
        const objective = await outsiderIdentity.query(api.objectives.getObjectiveById, {
            id: orgWideObjectiveId,
        });
        expect(objective?.capabilities.canView).toBe(true);
        expect(objective?.capabilities.canContribute).toBe(false);

        await expect(
            outsiderIdentity.mutation(api.update_progress.createUpdateProgress, {
                objective: orgWideObjectiveId,
                updatedValue: 5,
                updateDate: Date.now(),
            })
        ).rejects.toThrow();
    });

    test('objective pagination consumes hidden rows to fill the visible page', async () => {
        const visibleObjectiveId = await createTestObjective(t, {
            userId: ownerUser.docId,
            ownerId: ownerUser.docId,
            organizationId,
            title: 'Visible after private page',
            targetValue: 100,
            visibility: 'organization',
        });

        for (let index = 0; index < 3; index += 1) {
            await createTestObjective(t, {
                userId: ownerUser.docId,
                ownerId: ownerUser.docId,
                organizationId,
                title: `Hidden private objective ${index}`,
                targetValue: 100,
                visibility: 'private',
            });
        }

        const firstPage = await outsiderIdentity.query(api.objectives.getObjectives, {
            paginationOpts: { numItems: 2, cursor: null },
        });

        expect(firstPage.page).toHaveLength(2);
        expect(firstPage.needsContinuation).toBe(false);
        expect(firstPage.page.some(objective => objective._id === visibleObjectiveId)).toBe(true);
        expect(firstPage.page.every(objective => objective.visibility === 'organization')).toBe(
            true
        );
    });

    test('editor can contribute to private objective', async () => {
        const progress = await editorIdentity.mutation(api.update_progress.createUpdateProgress, {
            objective: privateObjectiveId,
            updatedValue: 10,
            updateDate: Date.now(),
        });
        expect(progress?.createdBy).toBe(editorUser.docId);
    });

    test('viewer cannot contribute to private objective', async () => {
        await expect(
            viewerIdentity.mutation(api.update_progress.createUpdateProgress, {
                objective: privateObjectiveId,
                updatedValue: 5,
                updateDate: Date.now(),
            })
        ).rejects.toThrow();
    });

    test('editor cannot edit objective definition', async () => {
        await expect(
            editorIdentity.mutation(api.objectives.updateObjective, {
                id: privateObjectiveId,
                title: 'Hijacked',
            })
        ).rejects.toThrow();
    });

    test('owner can soft-delete and restore objective', async () => {
        const deleted = await ownerIdentity.mutation(api.objectives.deleteObjective, {
            id: privateObjectiveId,
        });
        expect(deleted.status).toBe('soft_deleted');

        const hidden = await editorIdentity.query(api.objectives.getObjectiveById, {
            id: privateObjectiveId,
        });
        expect(hidden).toBeNull();

        const editorList = await editorIdentity.query(api.objectives.getObjectives, {
            paginationOpts: { numItems: 10, cursor: null },
        });
        expect(editorList.page.some(objective => objective._id === privateObjectiveId)).toBe(false);

        const editorSearch = await editorIdentity.query(api.objectives.searchObjectivesPaginated, {
            search: 'Private objective',
            paginationOpts: { numItems: 10, cursor: null },
        });
        expect(editorSearch.page.some(objective => objective._id === privateObjectiveId)).toBe(
            false
        );

        const ownerList = await ownerIdentity.query(api.objectives.getObjectives, {
            paginationOpts: { numItems: 10, cursor: null },
        });
        expect(ownerList.page.some(objective => objective._id === privateObjectiveId)).toBe(false);

        const trash = await ownerIdentity.query(api.objectives.getDeletedObjectives, {
            paginationOpts: { numItems: 10, cursor: null },
        });
        expect(trash.page.some(objective => objective._id === privateObjectiveId)).toBe(true);

        const restored = await ownerIdentity.mutation(api.objectives.restoreObjective, {
            id: privateObjectiveId,
        });
        expect(restored.deletedAt).toBeUndefined();

        await expect(
            ownerIdentity.mutation(api.objectives.purgeObjective, {
                id: privateObjectiveId,
            })
        ).rejects.toThrow();
    });

    test('admin can manage collaborators and transfer ownership', async () => {
        const collaboratorId = await adminIdentity.mutation(api.objectives.addCollaborator, {
            objectiveId: orgWideObjectiveId,
            userId: outsiderUser.docId,
            role: 'editor',
        });
        expect(collaboratorId).toBeDefined();

        const transferred = await adminIdentity.mutation(
            api.objectives.transferObjectiveOwnership,
            {
                id: orgWideObjectiveId,
                newOwnerId: adminUser.docId,
            }
        );
        expect(transferred.ownerId).toBe(adminUser.docId);
    });

    test('reassigns ownership when owner leaves organization', async () => {
        await t.run(async ctx => {
            const membership = await ctx.db
                .query('member')
                .withIndex('by_organizationId_and_userId', q =>
                    q.eq('organizationId', organizationId).eq('userId', ownerUser.docId)
                )
                .first();
            if (membership) await ctx.db.delete('member', membership._id);

            const { continueMemberLeaveCleanup } =
                await import('../jobs/organizations/memberLeaveCleanup');
            await continueMemberLeaveCleanup(ctx, {
                organizationId,
                userId: ownerUser.docId,
                phase: 'collaborators',
            });
            await continueMemberLeaveCleanup(ctx, {
                organizationId,
                userId: ownerUser.docId,
                phase: 'objectives',
            });
        });

        const objective = await t.run(async ctx => ctx.db.get('objectives', privateObjectiveId));
        expect(objective?.ownerId).toBe(editorUser.docId);
    });
});
