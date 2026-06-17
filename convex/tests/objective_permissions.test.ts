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
    test('global admin can perform all objective actions', () => {
        const subject = buildPermissionSubject({
            userId: otherUserId,
            platformRole: 'globalAdmin',
            memberRole: 'member',
            collaboratorRole: null,
        });
        const objective = {
            ownerId,
            visibility: 'private' as const,
        };

        expect(canObjective('view', subject, objective)).toBe(true);
        expect(canObjective('editDefinition', subject, objective)).toBe(true);
        expect(canObjective('delete', subject, objective)).toBe(true);
        expect(canObjective('contributeProgress', subject, objective)).toBe(true);
    });

    test('org admin can manage any objective in org', () => {
        const subject = buildPermissionSubject({
            userId: otherUserId,
            platformRole: 'user',
            memberRole: 'admin',
            collaboratorRole: null,
        });
        const objective = {
            ownerId,
            visibility: 'private' as const,
        };

        expect(canObjective('view', subject, objective)).toBe(true);
        expect(canObjective('editDefinition', subject, objective)).toBe(true);
        expect(canObjective('delete', subject, objective)).toBe(true);
    });

    test('owner can manage their objective', () => {
        const subject = buildPermissionSubject({
            userId: ownerId,
            platformRole: 'user',
            memberRole: 'member',
            collaboratorRole: null,
        });
        const objective = {
            ownerId,
            visibility: 'private' as const,
        };

        expect(canObjective('editDefinition', subject, objective)).toBe(true);
        expect(canObjective('manageCollaborators', subject, objective)).toBe(true);
        expect(canObjective('contributeProgress', subject, objective)).toBe(true);
    });

    test('editor collaborator can view and contribute but not edit definition', () => {
        const subject = buildPermissionSubject({
            userId: otherUserId,
            platformRole: 'user',
            memberRole: 'member',
            collaboratorRole: 'editor',
        });
        const objective = {
            ownerId,
            visibility: 'private' as const,
        };

        expect(canObjective('view', subject, objective)).toBe(true);
        expect(canObjective('contributeProgress', subject, objective)).toBe(true);
        expect(canObjective('editDefinition', subject, objective)).toBe(false);
        expect(canObjective('delete', subject, objective)).toBe(false);
    });

    test('viewer collaborator can only view', () => {
        const subject = buildPermissionSubject({
            userId: otherUserId,
            platformRole: 'user',
            memberRole: 'member',
            collaboratorRole: 'viewer',
        });
        const objective = {
            ownerId,
            visibility: 'private' as const,
        };

        expect(canObjective('view', subject, objective)).toBe(true);
        expect(canObjective('contributeProgress', subject, objective)).toBe(false);
    });

    test('member without relationship cannot view private objective', () => {
        const subject = buildPermissionSubject({
            userId: otherUserId,
            platformRole: 'user',
            memberRole: 'member',
            collaboratorRole: null,
        });
        const objective = {
            ownerId,
            visibility: 'private' as const,
        };

        expect(canObjective('view', subject, objective)).toBe(false);
        expect(canObjective('contributeProgress', subject, objective)).toBe(false);
    });

    test('member without relationship can view organization-wide objective', () => {
        const subject = buildPermissionSubject({
            userId: otherUserId,
            platformRole: 'user',
            memberRole: 'member',
            collaboratorRole: null,
        });
        const objective = {
            ownerId,
            visibility: 'organization' as const,
        };

        expect(canObjective('view', subject, objective)).toBe(true);
        expect(canObjective('contributeProgress', subject, objective)).toBe(false);
    });

    test('soft-deleted objective is hidden except for owner restore', () => {
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
        expect(canObjective('editDefinition', subject, objective)).toBe(false);
    });

    test('author can edit own progress; owner can edit any progress', () => {
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
    });

    test('buildObjectiveCapabilities reflects role matrix', () => {
        const subject = buildPermissionSubject({
            userId: otherUserId,
            platformRole: 'user',
            memberRole: 'member',
            collaboratorRole: 'editor',
        });
        const capabilities = buildObjectiveCapabilities(subject, {
            ownerId,
            visibility: 'private',
        });

        expect(capabilities.canView).toBe(true);
        expect(capabilities.canContribute).toBe(true);
        expect(capabilities.canEditDefinition).toBe(false);
        expect(capabilities.canManageCollaborators).toBe(false);
    });
});
