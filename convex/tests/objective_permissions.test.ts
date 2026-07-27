import { describe, expect, test } from 'vitest';
import type { Id } from '../_generated/dataModel';
import {
    buildObjectiveCapabilities,
    buildPermissionSubject,
    canEditProgress,
    canObjective,
} from '../domain/objectives/permissions';

function uid(value: string): Id<'user'> {
    return value as Id<'user'>;
}

const ownerId = uid('owner1');
const otherUserId = uid('other1');

describe('objective permissions', () => {
    test('role matrix grants and denies core objective actions', () => {
        const objective = { ownerId, visibility: 'private' as const };
        const cases = [
            {
                subject: buildPermissionSubject({
                    userId: otherUserId,
                    platformRole: 'globalAdmin',
                    memberRole: 'member',
                    collaboratorRole: null,
                }),
                expected: {
                    view: true,
                    editDefinition: true,
                    delete: true,
                    contributeProgress: true,
                },
            },
            {
                subject: buildPermissionSubject({
                    userId: otherUserId,
                    platformRole: 'user',
                    memberRole: 'admin',
                    collaboratorRole: null,
                }),
                expected: {
                    view: true,
                    editDefinition: true,
                    delete: true,
                    contributeProgress: true,
                },
            },
            {
                subject: buildPermissionSubject({
                    userId: ownerId,
                    platformRole: 'user',
                    memberRole: 'member',
                    collaboratorRole: null,
                }),
                expected: {
                    view: true,
                    editDefinition: true,
                    manageCollaborators: true,
                    contributeProgress: true,
                },
            },
            {
                subject: buildPermissionSubject({
                    userId: otherUserId,
                    platformRole: 'user',
                    memberRole: 'member',
                    collaboratorRole: 'editor',
                }),
                expected: {
                    view: true,
                    contributeProgress: true,
                    editDefinition: false,
                    delete: false,
                },
            },
            {
                subject: buildPermissionSubject({
                    userId: otherUserId,
                    platformRole: 'user',
                    memberRole: 'member',
                    collaboratorRole: 'viewer',
                }),
                expected: {
                    view: true,
                    contributeProgress: false,
                    editDefinition: false,
                },
            },
            {
                subject: buildPermissionSubject({
                    userId: otherUserId,
                    platformRole: 'user',
                    memberRole: 'member',
                    collaboratorRole: null,
                }),
                expected: {
                    view: false,
                    contributeProgress: false,
                    editDefinition: false,
                },
            },
        ];

        for (const { subject, expected } of cases) {
            for (const [action, allowed] of Object.entries(expected)) {
                expect(
                    canObjective(action as Parameters<typeof canObjective>[0], subject, objective)
                ).toBe(allowed);
            }
        }

        const unrelatedMember = buildPermissionSubject({
            userId: otherUserId,
            platformRole: 'user',
            memberRole: 'member',
            collaboratorRole: null,
        });
        expect(canObjective('view', unrelatedMember, { ownerId, visibility: 'organization' })).toBe(
            true
        );
    });

    test('soft-deleted objectives are immutable and active objectives cannot be purged', () => {
        const subject = buildPermissionSubject({
            userId: ownerId,
            platformRole: 'user',
            memberRole: 'member',
            collaboratorRole: null,
        });
        const objective = {
            ownerId,
            visibility: 'private' as const,
            deletedAt: Date.now(),
        };

        expect(canObjective('view', subject, objective)).toBe(true);
        expect(canObjective('restore', subject, objective)).toBe(true);
        expect(canObjective('purge', subject, objective)).toBe(true);
        expect(canObjective('editDefinition', subject, objective)).toBe(false);
        expect(canObjective('contributeProgress', subject, objective)).toBe(false);
        expect(canObjective('purge', subject, { ...objective, deletedAt: undefined })).toBe(false);
        expect(canObjective('restore', subject, { ...objective, deletedAt: undefined })).toBe(
            false
        );

        const adminSubject = buildPermissionSubject({
            userId: otherUserId,
            platformRole: 'globalAdmin',
            memberRole: 'member',
            collaboratorRole: null,
        });
        expect(canObjective('view', adminSubject, objective)).toBe(true);
        expect(canObjective('restore', adminSubject, objective)).toBe(true);
        expect(canObjective('purge', adminSubject, objective)).toBe(true);
        expect(canObjective('editDefinition', adminSubject, objective)).toBe(false);
        expect(canObjective('purge', adminSubject, { ...objective, deletedAt: undefined })).toBe(
            false
        );
    });

    test('progress editing and exposed capabilities match collaborator permissions', () => {
        const authorSubject = buildPermissionSubject({
            userId: otherUserId,
            platformRole: 'user',
            memberRole: 'member',
            collaboratorRole: 'editor',
        });
        const ownerSubject = buildPermissionSubject({
            userId: ownerId,
            platformRole: 'user',
            memberRole: 'member',
            collaboratorRole: null,
        });

        expect(canEditProgress(authorSubject, { authorId: otherUserId, ownerId })).toBe(true);
        expect(canEditProgress(authorSubject, { authorId: ownerId, ownerId })).toBe(false);
        expect(canEditProgress(ownerSubject, { authorId: otherUserId, ownerId })).toBe(true);

        expect(
            buildObjectiveCapabilities(authorSubject, {
                ownerId,
                visibility: 'private',
            })
        ).toMatchObject({
            canView: true,
            canContribute: true,
            canEditDefinition: false,
            canManageCollaborators: false,
        });
    });
});
