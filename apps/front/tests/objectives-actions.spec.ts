import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { createTestUser, ensureDefaultCategories } from './test-helpers';

async function createObjective(page: import('@playwright/test').Page, title: string) {
    await ensureDefaultCategories(page);
    await page.goto('/dashboard/objectives');
    await page.getByTestId('objective-create-open').click();
    await page.getByTestId('objective-title-input').fill(title);
    await page.getByTestId('objective-description-input').fill('Test objective for status actions');
    await page.getByTestId('objective-category-select').click();
    await page.getByRole('option', { name: /personal/i }).click();
    await page.getByTestId('objective-target-input').fill('100');
    await page.getByTestId('objective-unit-input').fill('units');
    await page.getByTestId('objective-current-input').fill('50');
    // Status is auto-set to active by the workflow
    await page.getByTestId('objective-save-button').click();
    await expect(page.getByText(title)).toBeVisible({ timeout: 10000 });
}

test.describe('Objective Status Actions', () => {
    test('complete objective: changes status and updates value to target', async ({ page }) => {
        const uuid = randomUUID();
        const objectiveTitle = `complete-test-${uuid}`;

        await createTestUser(page);
        await createObjective(page, objectiveTitle);

        // Find the objective row
        const row = page.locator('tr', { hasText: objectiveTitle }).first();
        await expect(row).toBeVisible();

        // Verify initial status reflects active progress
        await expect(row).toContainText(/in progress|en progreso/i);

        // Click complete action (CheckCircle icon or menu option)
        const completeButton = row.getByRole('button', { name: /complete|completar/i }).first();
        await completeButton.click();

        // Wait for status update
        await page.waitForTimeout(1000);

        // Reload to verify persistence
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Verify status changed to completed
        const updatedRow = page.locator('tr', { hasText: objectiveTitle }).first();
        await expect(updatedRow).toContainText(/completed|completado/i);

        // Verify current value equals target value (100)
        await expect(updatedRow).toContainText('100');
    });

    test('pause objective: changes status to paused', async ({ page }) => {
        const uuid = randomUUID();
        const objectiveTitle = `pause-test-${uuid}`;

        await createTestUser(page);
        await createObjective(page, objectiveTitle);

        // Find the objective row
        const row = page.locator('tr', { hasText: objectiveTitle }).first();
        await expect(row).toBeVisible();

        // Click pause action
        const pauseButton = row.getByRole('button', { name: /pause|pausar/i }).first();
        await pauseButton.click();

        // Wait for status update
        await page.waitForTimeout(1000);

        // Reload to verify persistence
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Verify status changed to paused
        const updatedRow = page.locator('tr', { hasText: objectiveTitle }).first();
        await expect(updatedRow).toContainText(/paused|pausado/i);
    });

    test('resume objective: changes paused status back to in progress', async ({ page }) => {
        const uuid = randomUUID();
        const objectiveTitle = `resume-test-${uuid}`;

        await createTestUser(page);
        await createObjective(page, objectiveTitle);

        // First pause the objective
        let row = page.locator('tr', { hasText: objectiveTitle }).first();
        let pauseButton = row.getByRole('button', { name: /pause|pausar/i }).first();
        await pauseButton.click();
        await page.waitForTimeout(1000);

        // Reload and verify it's paused
        await page.reload();
        await page.waitForLoadState('networkidle');
        row = page.locator('tr', { hasText: objectiveTitle }).first();
        await expect(row).toContainText(/paused|pausado/i);

        // Now resume the objective
        const resumeButton = row
            .getByRole('button', { name: /resume|reanudar|continuar/i })
            .first();
        await resumeButton.click();
        await page.waitForTimeout(1000);

        // Reload to verify persistence
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Verify status is back to active
        const updatedRow = page.locator('tr', { hasText: objectiveTitle }).first();
        await expect(updatedRow).toContainText(/in progress|en progreso/i);
    });

    test('archive objective: changes status to archived', async ({ page }) => {
        const uuid = randomUUID();
        const objectiveTitle = `archive-test-${uuid}`;

        await createTestUser(page);
        await createObjective(page, objectiveTitle);

        // Find the objective row
        const row = page.locator('tr', { hasText: objectiveTitle }).first();
        await expect(row).toBeVisible();

        // Click archive action
        const archiveButton = row.getByRole('button', { name: /archive|archivar/i }).first();
        await archiveButton.click();

        // Wait for status update
        await page.waitForTimeout(1000);

        // Reload to verify persistence
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Verify status changed to archived
        const updatedRow = page.locator('tr', { hasText: objectiveTitle }).first();
        await expect(updatedRow).toContainText(/archived|archivado/i);
    });

    test('status actions create notifications', async ({ page }) => {
        const uuid = randomUUID();
        const objectiveTitle = `notify-test-${uuid}`;

        await createTestUser(page);
        await createObjective(page, objectiveTitle);

        // Complete the objective
        const row = page.locator('tr', { hasText: objectiveTitle }).first();
        const completeButton = row.getByRole('button', { name: /complete|completar/i }).first();
        await completeButton.click();
        await page.waitForTimeout(1000);

        // Navigate to notifications
        await page.goto('/dashboard/notifications');
        await expect(page).toHaveURL(/\/dashboard\/notifications$/);

        // Verify notification was created for the status change
        await expect(page.getByText(/marked as completed|marcado como completado/i)).toBeVisible({
            timeout: 10000,
        });
        // Use first() because the objective title appears twice (in the notification text and as a link)
        await expect(page.getByText(objectiveTitle).first()).toBeVisible();
    });

    test('multiple status changes persist correctly', async ({ page }) => {
        const uuid = randomUUID();
        const objectiveTitle = `multi-status-${uuid}`;

        await createTestUser(page);
        await createObjective(page, objectiveTitle);

        let row = page.locator('tr', { hasText: objectiveTitle }).first();

        // 1. Pause
        let pauseButton = row.getByRole('button', { name: /pause|pausar/i }).first();
        await pauseButton.click();
        await page.waitForTimeout(1000);
        await page.reload();
        await page.waitForLoadState('networkidle');
        row = page.locator('tr', { hasText: objectiveTitle }).first();
        await expect(row).toContainText(/paused|pausado/i);

        // 2. Resume
        let resumeButton = row.getByRole('button', { name: /resume|reanudar|continuar/i }).first();
        await resumeButton.click();
        await page.waitForTimeout(1000);
        await page.reload();
        await page.waitForLoadState('networkidle');
        row = page.locator('tr', { hasText: objectiveTitle }).first();
        await expect(row).toContainText(/in progress|en progreso/i);

        // 3. Complete
        let completeButton = row.getByRole('button', { name: /complete|completar/i }).first();
        await completeButton.click();
        await page.waitForTimeout(1000);
        await page.reload();
        await page.waitForLoadState('networkidle');
        row = page.locator('tr', { hasText: objectiveTitle }).first();
        await expect(row).toContainText(/completed|completado/i);

        // 4. Archive
        let archiveButton = row.getByRole('button', { name: /archive|archivar/i }).first();
        await archiveButton.click();
        await page.waitForTimeout(1000);
        await page.reload();
        await page.waitForLoadState('networkidle');
        row = page.locator('tr', { hasText: objectiveTitle }).first();
        await expect(row).toContainText(/archived|archivado/i);
    });

    test('archived objectives have no action buttons', async ({ page }) => {
        const uuid = randomUUID();
        const objectiveTitle = `archived-no-actions-${uuid}`;

        await createTestUser(page);
        await createObjective(page, objectiveTitle);

        // Archive the objective
        let row = page.locator('tr', { hasText: objectiveTitle }).first();
        let archiveButton = row.getByRole('button', { name: /archive|archivar/i }).first();
        await archiveButton.click();
        await page.waitForTimeout(1000);
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Verify archived status
        row = page.locator('tr', { hasText: objectiveTitle }).first();
        await expect(row).toContainText(/archived|archivado/i);

        // Verify no action buttons are present (except possibly more menu)
        const completeButtons = row.getByRole('button', { name: /complete|completar/i });
        const pauseButtons = row.getByRole('button', { name: /pause|pausar/i });
        const resumeButtons = row.getByRole('button', { name: /resume|reanudar|continuar/i });

        // These should not exist or not be visible
        await expect(completeButtons).toHaveCount(0);
        await expect(pauseButtons).toHaveCount(0);
        await expect(resumeButtons).toHaveCount(0);
    });
});
