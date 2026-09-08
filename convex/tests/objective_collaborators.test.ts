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

describe('objective collaborators management', () => {
    const t = initConvexTest();

    let organizationId: Id<'organization'>;
    let ownerUser: Awaited<ReturnType<typeof createTestUser>>;
    let editorUser: Awaited<ReturnType<typeof createTestUser>>;
    let viewerUser: Awaited<ReturnType<typeof createTestUser>>;
    let nonMemberUser: Awaited<ReturnType<typeof createTestUser>>;
    let ownerIdentity: TestConvexForDataModel<DataModel>;
    let editorIdentity: TestConvexForDataModel<DataModel>;
    let viewerIdentity: TestConvexForDataModel<DataModel>;
    let objectiveId: Id<'objectives'>;
    let editorCollaboratorId: Id<'objectiveCollaborators'>;
    let viewerCollaboratorId: Id<'objectiveCollaborators'>;

    beforeEach(async () => {
        const suffix = Math.random().toString(36).slice(2, 12);

        organizationId = await createTestOrganization(t, {
            name: `Collab Org ${suffix}`,
            slug: `collab-org-${suffix}`,
        });

        ownerUser = await createTestUser(t, {
            userId: `collab-owner-${suffix}`,
            email: `collab-owner-${suffix}@example.com`,
            name: 'Owner',
        });
        editorUser = await createTestUser(t, {
            userId: `collab-editor-${suffix}`,
            email: `collab-editor-${suffix}@example.com`,
            name: 'Editor',
        });
        viewerUser = await createTestUser(t, {
            userId: `collab-viewer-${suffix}`,
            email: `collab-viewer-${suffix}@example.com`,
            name: 'Viewer',
        });
        nonMemberUser = await createTestUser(t, {
            userId: `collab-nonmember-${suffix}`,
            email: `collab-nonmember-${suffix}@example.com`,
            name: 'Non Member',
        });

        await createTestMember(t, { organizationId, userId: ownerUser.docId, role: 'member' });
        await createTestMember(t, { organizationId, userId: editorUser.docId, role: 'member' });
        await createTestMember(t, { organizationId, userId: viewerUser.docId, role: 'member' });

        ownerIdentity = t.withIdentity(identityFor(ownerUser));
        editorIdentity = t.withIdentity(identityFor(editorUser));
        viewerIdentity = t.withIdentity(identityFor(viewerUser));

        objectiveId = await createTestObjective(t, {
            userId: ownerUser.docId,
            ownerId: ownerUser.docId,
            organizationId,
            title: 'Collaborated objective',
            targetValue: 100,
            visibility: 'private',
        });

        editorCollaboratorId = await createTestCollaborator(t, {
            objectiveId,
            userId: editorUser.docId,
            organizationId,
            addedBy: ownerUser.docId,
            role: 'editor',
        });
        viewerCollaboratorId = await createTestCollaborator(t, {
            objectiveId,
            userId: viewerUser.docId,
            organizationId,
            addedBy: ownerUser.docId,
            role: 'viewer',
        });
    });

    describe('getObjectiveCollaborators', () => {
        test('owner lists collaborators with user info', async () => {
            const collaborators = await ownerIdentity.query(
                api.objectives.getObjectiveCollaborators,
                { objectiveId }
            );

            expect(collaborators).toHaveLength(2);
            const editorEntry = collaborators.find(
                collaborator => collaborator.userId === editorUser.docId
            );
            expect(editorEntry?.role).toBe('editor');
            expect(editorEntry?.user?.email).toBe(editorUser.email);
            expect(editorEntry?.user?.name).toBe('Editor');
        });

        test('viewer collaborator can read collaborators of a viewable objective', async () => {
            const collaborators = await viewerIdentity.query(
                api.objectives.getObjectiveCollaborators,
                { objectiveId }
            );
            expect(collaborators).toHaveLength(2);
        });
    });

    describe('updateCollaboratorRole', () => {
        test('owner downgrades editor to viewer', async () => {
            const updated = await ownerIdentity.mutation(api.objectives.updateCollaboratorRole, {
                collaboratorId: editorCollaboratorId,
                role: 'viewer',
            });

            expect(updated?.role).toBe('viewer');
        });

        test('rejects updating a non-existent collaborator', async () => {
            const danglingId = await ownerIdentity.run(async ctx => {
                const id = await ctx.db.insert('objectiveCollaborators', {
                    objectiveId,
                    userId: nonMemberUser.docId,
                    organizationId,
                    role: 'viewer',
                    addedBy: ownerUser.docId,
                    createdAt: Date.now(),
                });
                await ctx.db.delete('objectiveCollaborators', id);
                return id;
            });

            await expect(
                ownerIdentity.mutation(api.objectives.updateCollaboratorRole, {
                    collaboratorId: danglingId,
                    role: 'editor',
                })
            ).rejects.toThrow(/COLLABORATOR_NOT_FOUND/);
        });

        test('editor cannot change collaborator roles', async () => {
            await expect(
                editorIdentity.mutation(api.objectives.updateCollaboratorRole, {
                    collaboratorId: viewerCollaboratorId,
                    role: 'editor',
                })
            ).rejects.toThrow(/NOT_AUTHORIZED|FORBIDDEN|RLS/i);
        });
    });

    describe('removeCollaborator', () => {
        test('owner removes a collaborator', async () => {
            const result = await ownerIdentity.mutation(api.objectives.removeCollaborator, {
                collaboratorId: viewerCollaboratorId,
            });
            expect(result).toEqual({ success: true });

            const remaining = await ownerIdentity.query(api.objectives.getObjectiveCollaborators, {
                objectiveId,
            });
            expect(remaining).toHaveLength(1);
            expect(remaining[0]?.userId).toBe(editorUser.docId);
        });

        test('rejects removing a non-existent collaborator', async () => {
            const danglingId = await ownerIdentity.run(async ctx => {
                const id = await ctx.db.insert('objectiveCollaborators', {
                    objectiveId,
                    userId: nonMemberUser.docId,
                    organizationId,
                    role: 'viewer',
                    addedBy: ownerUser.docId,
                    createdAt: Date.now(),
                });
                await ctx.db.delete('objectiveCollaborators', id);
                return id;
            });

            await expect(
                ownerIdentity.mutation(api.objectives.removeCollaborator, {
                    collaboratorId: danglingId,
                })
            ).rejects.toThrow(/COLLABORATOR_NOT_FOUND/);
        });

        test('viewer cannot remove collaborators', async () => {
            await expect(
                viewerIdentity.mutation(api.objectives.removeCollaborator, {
                    collaboratorId: editorCollaboratorId,
                })
            ).rejects.toThrow(/NOT_AUTHORIZED|FORBIDDEN|RLS/i);
        });
    });

    describe('addCollaborator error paths', () => {
        test('rejects adding the owner as a collaborator', async () => {
            await expect(
                ownerIdentity.mutation(api.objectives.addCollaborator, {
                    objectiveId,
                    userId: ownerUser.docId,
                    role: 'editor',
                })
            ).rejects.toThrow(/COLLABORATOR_ALREADY_EXISTS/);
        });

        test('rejects adding a duplicate collaborator', async () => {
            await expect(
                ownerIdentity.mutation(api.objectives.addCollaborator, {
                    objectiveId,
                    userId: editorUser.docId,
                    role: 'editor',
                })
            ).rejects.toThrow(/COLLABORATOR_ALREADY_EXISTS/);
        });

        test('rejects adding a user that is not a member of the organization', async () => {
            await expect(
                ownerIdentity.mutation(api.objectives.addCollaborator, {
                    objectiveId,
                    userId: nonMemberUser.docId,
                    role: 'editor',
                })
            ).rejects.toThrow(/USER_NOT_FOUND/);
        });

        test('editor cannot add collaborators', async () => {
            const candidate = await createTestUser(t, {
                userId: `collab-candidate-${Math.random().toString(36).slice(2, 10)}`,
                email: `collab-candidate-${Math.random().toString(36).slice(2, 10)}@example.com`,
                name: 'Candidate',
            });
            await createTestMember(t, { organizationId, userId: candidate.docId, role: 'member' });

            await expect(
                editorIdentity.mutation(api.objectives.addCollaborator, {
                    objectiveId,
                    userId: candidate.docId,
                    role: 'viewer',
                })
            ).rejects.toThrow(/NOT_AUTHORIZED|FORBIDDEN|RLS/i);
        });
    });

    describe('setObjectiveVisibility', () => {
        test('owner switches visibility from private to organization', async () => {
            const updated = await ownerIdentity.mutation(api.objectives.setObjectiveVisibility, {
                id: objectiveId,
                visibility: 'organization',
            });

            expect(updated.visibility).toBe('organization');
        });

        test('editor cannot change visibility', async () => {
            await expect(
                editorIdentity.mutation(api.objectives.setObjectiveVisibility, {
                    id: objectiveId,
                    visibility: 'organization',
                })
            ).rejects.toThrow(/NOT_AUTHORIZED|FORBIDDEN|RLS/i);
        });
    });

    describe('transferObjectiveOwnership authorization', () => {
        test('editor cannot transfer ownership', async () => {
            await expect(
                editorIdentity.mutation(api.objectives.transferObjectiveOwnership, {
                    id: objectiveId,
                    newOwnerId: editorUser.docId,
                })
            ).rejects.toThrow(/NOT_AUTHORIZED|FORBIDDEN|RLS/i);
        });

        test('owner can transfer ownership and clears the new owner collaborator row', async () => {
            const transferred = await ownerIdentity.mutation(
                api.objectives.transferObjectiveOwnership,
                {
                    id: objectiveId,
                    newOwnerId: editorUser.docId,
                }
            );

            expect(transferred.ownerId).toBe(editorUser.docId);

            const collaborators = await editorIdentity.query(
                api.objectives.getObjectiveCollaborators,
                { objectiveId }
            );
            expect(
                collaborators.some(collaborator => collaborator.userId === editorUser.docId)
            ).toBe(false);
        });
    });
});
