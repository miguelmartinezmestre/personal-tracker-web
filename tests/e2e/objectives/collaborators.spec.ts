import { test, expect } from '../../fixtures/test-base';
import { createObjective } from '../../helpers/test-helpers';
import {
    addCollaboratorFromDialog,
    changeCollaboratorRole,
    collaboratorRowFilter,
    createProgressUpdate,
    openCollaboratorsDialog,
    openObjectiveProgressPage,
    removeCollaboratorFromDialog,
    setupCollaboratorInOrganization,
    transferOwnershipToCollaborator,
    type CollaboratorSession,
} from '../../helpers/collaboration';

test.describe('Objective collaborators multi-user', () => {
    let collaborator: CollaboratorSession | undefined;

    test.beforeEach(async ({ page, browser }) => {
        collaborator = await setupCollaboratorInOrganization(browser, page);
    });

    test.afterEach(async () => {
        await collaborator?.context.close();
        collaborator = undefined;
    });

    function requireCollaborator(): CollaboratorSession {
        if (!collaborator) {
            throw new Error('Collaborator session was not created');
        }
        return collaborator;
    }

    test(
        'editor collaborator can contribute progress',
        { tag: ['@REQ-COLABORACION-005', '@REQ-PROGRESO-001'] },
        async ({ page }) => {
            const { page: collaboratorPage, user } = requireCollaborator();
            const title = `Editor objective ${Date.now()}`;
            await createObjective(page, { title, targetValue: 100 });

            await openCollaboratorsDialog(page, title);
            await addCollaboratorFromDialog(page, user, 'editor');

            await openObjectiveProgressPage(collaboratorPage, title);
            await expect(collaboratorPage.getByTestId('progress-create-open')).toBeVisible({
                timeout: 5000,
            });

            await createProgressUpdate(collaboratorPage, '25', 'Editor contribution');
            await expect(
                collaboratorPage.getByTestId('table-row').filter({ hasText: /25/ }).first()
            ).toBeVisible({ timeout: 10000 });
        }
    );

    test(
        'viewer collaborator cannot contribute progress',
        { tag: ['@REQ-COLABORACION-005'] },
        async ({ page }) => {
            const { page: collaboratorPage, user } = requireCollaborator();
            const title = `Viewer objective ${Date.now()}`;
            await createObjective(page, { title, targetValue: 100 });

            await openCollaboratorsDialog(page, title);
            await addCollaboratorFromDialog(page, user, 'viewer');

            await openObjectiveProgressPage(collaboratorPage, title);
            await expect(collaboratorPage.getByTestId('progress-create-open')).toHaveCount(0, {
                timeout: 5000,
            });
        }
    );

    test(
        'owner can change collaborator role and remove collaborator',
        { tag: ['@REQ-COLABORACION-005'] },
        async ({ page }) => {
            const { user } = requireCollaborator();
            const title = `Manage collaborators ${Date.now()}`;
            await createObjective(page, { title, targetValue: 100 });

            await openCollaboratorsDialog(page, title);
            await addCollaboratorFromDialog(page, user, 'editor');

            await changeCollaboratorRole(page, user, 'viewer');
            await removeCollaboratorFromDialog(page, user);

            await expect(collaboratorRowFilter(page, user)).toHaveCount(0, {
                timeout: 5000,
            });
        }
    );

    test(
        'transfer ownership lets new owner manage collaborators',
        { tag: ['@REQ-COLABORACION-006'] },
        async ({ page }) => {
            const { page: collaboratorPage, user } = requireCollaborator();
            const title = `Transfer ownership ${Date.now()}`;
            await createObjective(page, {
                title,
                targetValue: 100,
                visibility: 'organization',
            });

            await openCollaboratorsDialog(page, title);
            await addCollaboratorFromDialog(page, user, 'editor');
            await transferOwnershipToCollaborator(page, user);

            await collaboratorPage.goto('/dashboard/objectives', {
                waitUntil: 'domcontentloaded',
            });
            const row = collaboratorPage
                .getByTestId('table-row')
                .filter({ hasText: title })
                .first();
            await expect(row).toBeVisible({ timeout: 10000 });
            await expect(row.getByTestId('objective-collaborators-open')).toBeVisible({
                timeout: 5000,
            });
        }
    );

    test(
        'organization-visible objective is visible to other members',
        { tag: ['@REQ-COLABORACION-004', '@REQ-COLABORACION-003'] },
        async ({ page }) => {
            const { page: collaboratorPage } = requireCollaborator();
            const title = `Org-wide visible ${Date.now()}`;
            await createObjective(page, {
                title,
                targetValue: 100,
                visibility: 'organization',
            });

            await collaboratorPage.goto('/dashboard/objectives', {
                waitUntil: 'domcontentloaded',
            });
            const row = collaboratorPage
                .getByTestId('table-row')
                .filter({ hasText: title })
                .first();
            await expect(row).toBeVisible({ timeout: 15000 });
        }
    );
});
