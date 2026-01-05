import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { createTestUser, takeScreenshot } from './test-helpers';

test('teams end-to-end: create, edit, delete team', async ({ page }) => {
    const uuid = randomUUID();
    await createTestUser(page);

    await page.goto('/dashboard/teams');
    await page.waitForLoadState('networkidle');

    const createButton = page.getByTestId('team-create-open');
    await expect(createButton).toBeVisible({ timeout: 10000 });

    await takeScreenshot(page, 'teams-end-to-end', 'teams-list-initial');

    // Open create modal and create team
    await createButton.click();
    await expect(page.getByTestId('team-name-input')).toBeVisible();

    const originalTeamName = `testteam-${uuid}`;
    await page.getByTestId('team-name-input').fill(originalTeamName);
    await page.getByTestId('team-description-input').fill('Test team description');
    await expect(page.getByTestId('team-save-button')).toBeEnabled();
    await page.getByTestId('team-save-button').click();

    // Verify the new team appears in the list
    await expect(page.getByText(originalTeamName)).toBeVisible({ timeout: 10000 });

    // Edit the team
    const editedTeamName = `edited-team-${uuid}`;
    const teamRow = page.locator('tr', { hasText: originalTeamName }).first();
    await teamRow.getByTestId('team-edit-open').click();
    await expect(page.getByTestId('team-edit-name-input')).toBeVisible();
    await page.getByTestId('team-edit-name-input').clear();
    await page.getByTestId('team-edit-name-input').fill(editedTeamName);
    await page.getByTestId('team-edit-save-button').click();
    await expect(page.getByText(editedTeamName)).toBeVisible({ timeout: 10000 });

    // Delete the team
    const editedTeamRow = page.locator('tr', { hasText: editedTeamName }).first();
    await editedTeamRow.getByTestId('team-delete-button').click();

    const deleteDialog = page.locator('[data-slot="alert-dialog-content"]');
    await expect(deleteDialog).toBeVisible();
    await deleteDialog.getByRole('button', { name: /confirm|delete|eliminar/i }).click();
    await expect(deleteDialog).toBeHidden({ timeout: 10000 });

    await expect(page.getByText(editedTeamName)).not.toBeVisible({ timeout: 10000 });
});

test('teams: navigate to team detail page', async ({ page }) => {
    const uuid = randomUUID();
    await createTestUser(page);

    await page.goto('/dashboard/teams');
    await page.waitForLoadState('networkidle');

    const createButton = page.getByTestId('team-create-open');
    await expect(createButton).toBeVisible({ timeout: 10000 });

    // Create a team first
    const teamName = `testteam-${uuid}`;
    await createButton.click();
    await expect(page.getByTestId('team-name-input')).toBeVisible();
    await page.getByTestId('team-name-input').fill(teamName);
    await page.getByTestId('team-description-input').fill('Test team description');
    await expect(page.getByTestId('team-save-button')).toBeEnabled();
    await page.getByTestId('team-save-button').click();

    await expect(page.getByText(teamName)).toBeVisible({ timeout: 10000 });

    // Navigate to team detail
    const teamRow = page.locator('tr', { hasText: teamName }).first();
    await teamRow.getByTestId('team-detail-link').click();

    await expect(page).toHaveURL(/\/dashboard\/teams\/[^/]+$/);
});
