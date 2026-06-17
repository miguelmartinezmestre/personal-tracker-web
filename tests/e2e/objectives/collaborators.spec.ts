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
    let collaborator: CollaboratorSession;

    test.beforeEach(async ({ page, browser }) => {
        collaborator = await setupCollaboratorInOrganization(browser, page);
    });

    test.afterEach(async () => {
        await collaborator?.context.close();
    });

    test(
        'editor collaborator can contribute progress',
        { tag: ['@REQ-OBJETIVOS-013', '@REQ-PROGRESO-001'] },
        async ({ page }) => {
            const title = `Editor objective ${Date.now()}`;
            await createObjective(page, { title, targetValue: 100 });

            await openCollaboratorsDialog(page, title);
            await addCollaboratorFromDialog(page, collaborator.user, 'editor');

            await openObjectiveProgressPage(collaborator.page, title);
            await expect(collaborator.page.getByTestId('progress-create-open')).toBeVisible({
                timeout: 5000,
            });

            await createProgressUpdate(collaborator.page, '25', 'Editor contribution');
            await expect(
                collaborator.page.getByTestId('table-row').filter({ hasText: /25/ }).first()
            ).toBeVisible({ timeout: 10000 });
        }
    );

    test(
        'viewer collaborator cannot contribute progress',
        { tag: ['@REQ-OBJETIVOS-013'] },
        async ({ page }) => {
            const title = `Viewer objective ${Date.now()}`;
            await createObjective(page, { title, targetValue: 100 });

            await openCollaboratorsDialog(page, title);
            await addCollaboratorFromDialog(page, collaborator.user, 'viewer');

            await openObjectiveProgressPage(collaborator.page, title);
            await expect(collaborator.page.getByTestId('progress-create-open')).toHaveCount(0, {
                timeout: 5000,
            });
        }
    );

    test(
        'owner can change collaborator role and remove collaborator',
        { tag: ['@REQ-OBJETIVOS-013'] },
        async ({ page }) => {
            const title = `Manage collaborators ${Date.now()}`;
            await createObjective(page, { title, targetValue: 100 });

            await openCollaboratorsDialog(page, title);
            await addCollaboratorFromDialog(page, collaborator.user, 'editor');

            await changeCollaboratorRole(page, collaborator.user, 'viewer');
            await removeCollaboratorFromDialog(page, collaborator.user);

            await expect(collaboratorRowFilter(page, collaborator.user)).toHaveCount(0, {
                timeout: 5000,
            });
        }
    );

    test(
        'transfer ownership lets new owner manage collaborators',
        { tag: ['@REQ-OBJETIVOS-013'] },
        async ({ page }) => {
            const title = `Transfer ownership ${Date.now()}`;
            await createObjective(page, {
                title,
                targetValue: 100,
                visibility: 'organization',
            });

            await openCollaboratorsDialog(page, title);
            await addCollaboratorFromDialog(page, collaborator.user, 'editor');
            await transferOwnershipToCollaborator(page, collaborator.user);

            await collaborator.page.goto('/dashboard/objectives', {
                waitUntil: 'domcontentloaded',
            });
            const row = collaborator.page
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
        { tag: ['@REQ-OBJETIVOS-013'] },
        async ({ page }) => {
            const title = `Org-wide visible ${Date.now()}`;
            await createObjective(page, {
                title,
                targetValue: 100,
                visibility: 'organization',
            });

            await collaborator.page.goto('/dashboard/objectives', {
                waitUntil: 'domcontentloaded',
            });
            const row = collaborator.page
                .getByTestId('table-row')
                .filter({ hasText: title })
                .first();
            await expect(row).toBeVisible({ timeout: 15000 });
        }
    );
});
