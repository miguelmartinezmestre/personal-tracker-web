import type { Page } from '@playwright/test';
import { randomUUID } from 'crypto';
import { test, expect } from '../../fixtures/test-base';
import { setupCollaboratorInOrganization } from '../../helpers/collaboration';

async function createObjective(page: Page, title: string, memberAccess: 'none' | 'view') {
    await page.goto('/dashboard/objectives', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('objective-create-open').click();
    await page.getByTestId('objective-title-input').fill(title);
    await page.getByTestId('objective-target-input').fill('10');
    await page.getByTestId(`objective-member-access-${memberAccess}`).click();
    await page.getByTestId('objective-save-button').click();
    await expect(page.getByTestId('objective-row-link').filter({ hasText: title })).toBeVisible({
        timeout: 15000,
    });
}

test.describe('Objective permissions', () => {
    test(
        'members only see what the member role or their own permission allows, and edit only with edit',
        {
            tag: ['@REQ-COLABORACION-003', '@REQ-COLABORACION-004', '@REQ-COLABORACION-005'],
        },
        async ({ browser, page }) => {
            const collaborator = await setupCollaboratorInOrganization(browser, page);

            try {
                const suffix = randomUUID().substring(0, 8);
                const sharedTitle = `Shared ${suffix}`;
                const privateTitle = `Private ${suffix}`;
                await createObjective(page, sharedTitle, 'view');
                await expect(page.getByTestId('organization-switcher')).toContainText(
                    collaborator.organizationName
                );
                await createObjective(page, privateTitle, 'none');

                const memberPage = collaborator.page;
                await memberPage.goto('/dashboard/objectives', { waitUntil: 'domcontentloaded' });

                const sharedRow = memberPage
                    .getByTestId('objective-row-link')
                    .filter({ hasText: sharedTitle });

                await expect(sharedRow).toBeVisible({ timeout: 15000 });
                await expect(
                    memberPage.getByTestId('objective-row-link').filter({ hasText: privateTitle })
                ).toHaveCount(0);

                await sharedRow.click();
                await expect(memberPage.getByTestId('objective-detail-title')).toHaveText(
                    sharedTitle,
                    {
                        timeout: 15000,
                    }
                );
                await expect(memberPage.getByTestId('progress-form')).toHaveCount(0);
                await expect(memberPage.getByTestId('objective-edit-open')).toHaveCount(0);
                await expect(memberPage.getByTestId('objective-access-open')).toHaveCount(0);

                await page
                    .getByTestId('objective-row-link')
                    .filter({ hasText: sharedTitle })
                    .click();
                await page.getByTestId('objective-access-open').click();
                await page.getByTestId('objective-user-access-select').click();
                await page.getByRole('option', { name: collaborator.user.username }).click();
                await page.getByTestId('objective-user-access-level').click();
                await page.getByRole('option', { name: /view and edit/i }).click();
                await page.getByTestId('objective-user-access-add').click();
                await page.getByTestId('objective-access-save').click();
                await expect(page.getByTestId('objective-access-save')).toBeHidden({
                    timeout: 15000,
                });

                await expect(memberPage.getByTestId('progress-form')).toBeVisible({
                    timeout: 15000,
                });
                await memberPage.getByTestId('progress-value-input').fill('2');
                await memberPage.getByTestId('progress-save-button').click();
                await expect(memberPage.getByTestId('objective-progress-percent')).toContainText(
                    '20',
                    {
                        timeout: 15000,
                    }
                );
            } finally {
                await collaborator.context.close();
            }
        }
    );
});
