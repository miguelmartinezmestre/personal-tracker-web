import { expect, test } from '@playwright/test';
import { randomUUID } from 'crypto';
import {
    createObjective,
    createTestUser,
    ensureAuthenticatedState,
    logoutUser,
    openCreateProgressModal,
    DEFAULT_PASSWORD,
} from '../helpers/test-helpers';

test(
    'critical user journey works end to end',
    { tag: ['@cross-browser-critical'] },
    async ({ page }) => {
        const suffix = randomUUID().substring(0, 8);
        const username = `smoketest-${suffix}`;
        await createTestUser(page, {
            customUsername: username,
            customEmail: `smoke-${suffix}@test.com`,
            customOrganizationSlug: `org-${suffix}`,
            password: DEFAULT_PASSWORD,
        });
        await expect(page.getByTestId('welcome-message')).toContainText(username);
        await ensureAuthenticatedState(page);

        const objectiveTitle = `Smoke objective ${suffix}`;
        await createObjective(page, {
            title: objectiveTitle,
            description: 'Critical path objective',
            ensureCategories: false,
        });
        const objectiveRow = page
            .getByTestId('table-row')
            .filter({ hasText: objectiveTitle })
            .first();
        await expect(objectiveRow).toBeVisible();
        await objectiveRow.getByTestId('objective-progress-link').click();

        await openCreateProgressModal(page);
        await page.getByTestId('progress-value-input').fill('100');
        await page.getByTestId('progress-comment-input').fill('Objective completed');
        await page.getByTestId('progress-save-button').click();
        await expect(page.getByTestId('progress-value-input')).toHaveCount(0, { timeout: 15000 });

        await page.goto('/dashboard/achievements');
        await expect(page).toHaveURL(/\/dashboard\/achievements/);

        await logoutUser(page);
        await page.goto('/dashboard/home');
        await expect(page).toHaveURL(/\/login(\?|$)/);
    }
);
