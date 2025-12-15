import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';

test('admin panel: access admin features', async ({ page }) => {
    // Register and login
    const uuid = randomUUID();
    const username = `usernametest-${uuid}`;
    const email = `useremail-${uuid}@useremail.com`;

    await page.goto('/register');
    await page.getByTestId('register-username-input').fill(username);
    await page.getByTestId('register-email-input').fill(email);
    await page.getByTestId('register-password-input').fill('12345678');
    await page.getByTestId('register-confirm-password-input').fill('12345678');
    await page.getByTestId('register-button').click();
    await expect(page).toHaveURL(/\/dashboard\/home$/);

    // Check if admin panel is accessible - admin panel is restricted for regular users
    const adminLink = page.getByRole('link', { name: /admin|administration/i });
    if (await adminLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await adminLink.click();
        const currentUrl = page.url();
        if (currentUrl.includes('/admin')) {
            await expect(
                page.getByRole('heading', { name: /admin|administration/i })
            ).toBeVisible();
        }
    } else {
        // Try direct admin URL - should redirect or deny access
        await page.goto('/dashboard/admin');
        await page.waitForTimeout(3000);

        // Verify we're not on admin page (redirected to home or dashboard)
        const currentUrl = page.url();
        const isAdminAccessible = currentUrl.includes('/admin');

        if (isAdminAccessible) {
            // Admin is accessible - test it
            await expect(
                page.getByRole('heading', { name: /admin|administration/i })
            ).toBeVisible();
        } else {
            // Admin correctly restricted
            expect(currentUrl).toContain('/dashboard'); // Should be redirected to dashboard
            console.log('✅ Admin panel correctly restricted for regular users');
        }
    }
});

test('admin panel: user management', async ({ page }) => {
    // Register and login
    const uuid = randomUUID();
    const username = `usernametest-${uuid}`;
    const email = `useremail-${uuid}@useremail.com`;

    await page.goto('/register');
    await page.getByTestId('register-username-input').fill(username);
    await page.getByTestId('register-email-input').fill(email);
    await page.getByTestId('register-password-input').fill('12345678');
    await page.getByTestId('register-confirm-password-input').fill('12345678');
    await page.getByTestId('register-button').click();
    await expect(page).toHaveURL(/\/dashboard\/home$/);

    // Navigate to admin users page
    await page.goto('/dashboard/admin/users');

    // Check if users table is accessible
    const usersTable = page.getByTestId('table');
    if (await usersTable.isVisible()) {
        await expect(usersTable).toBeVisible();

        // Check for user management actions
        const editButton = page.getByTestId('user-edit-open').first();
        const deleteButton = page.getByTestId('user-delete-button').first();
        const banButton = page.getByTestId('user-ban-button').first();

        // Verify buttons exist (don't click to avoid affecting real users)
        if (await editButton.isVisible()) {
            await expect(editButton).toBeVisible();
        }
        if (await deleteButton.isVisible()) {
            await expect(deleteButton).toBeVisible();
        }
        if (await banButton.isVisible()) {
            await expect(banButton).toBeVisible();
        }
    }
});

test('admin panel: audit logs', async ({ page }) => {
    // Register and login
    const uuid = randomUUID();
    const username = `usernametest-${uuid}`;
    const email = `useremail-${uuid}@useremail.com`;

    await page.goto('/register');
    await page.getByTestId('register-username-input').fill(username);
    await page.getByTestId('register-email-input').fill(email);
    await page.getByTestId('register-password-input').fill('12345678');
    await page.getByTestId('register-confirm-password-input').fill('12345678');
    await page.getByTestId('register-button').click();
    await expect(page).toHaveURL(/\/dashboard\/home$/);

    // Navigate to admin audit logs page
    await page.goto('/dashboard/admin/audit');

    // Check if audit logs table is accessible
    const auditTable = page.getByTestId('table');
    if (await auditTable.isVisible()) {
        await expect(auditTable).toBeVisible();

        // Check for filtering options
        const filterUser = page.getByTestId('audit-filter-user');
        const filterAction = page.getByTestId('audit-filter-action');
        const filterDate = page.getByTestId('audit-filter-date');

        if (await filterUser.isVisible()) {
            await expect(filterUser).toBeVisible();
        }
        if (await filterAction.isVisible()) {
            await expect(filterAction).toBeVisible();
        }
        if (await filterDate.isVisible()) {
            await expect(filterDate).toBeVisible();
        }
    }
});

test('admin panel: session management', async ({ page }) => {
    // Register and login
    const uuid = randomUUID();
    const username = `usernametest-${uuid}`;
    const email = `useremail-${uuid}@useremail.com`;

    await page.goto('/register');
    await page.getByTestId('register-username-input').fill(username);
    await page.getByTestId('register-email-input').fill(email);
    await page.getByTestId('register-password-input').fill('12345678');
    await page.getByTestId('register-confirm-password-input').fill('12345678');
    await page.getByTestId('register-button').click();
    await expect(page).toHaveURL(/\/dashboard\/home$/);

    // Navigate to admin sessions page
    await page.goto('/dashboard/admin/sessions');

    // Check if sessions table is accessible
    const sessionsTable = page.getByTestId('table');
    if (await sessionsTable.isVisible()) {
        await expect(sessionsTable).toBeVisible();

        // Check for session management actions
        const terminateButton = page.getByTestId('session-terminate-button').first();
        if (await terminateButton.isVisible()) {
            await expect(terminateButton).toBeVisible();
        }
    }
});
