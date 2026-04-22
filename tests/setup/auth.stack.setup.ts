import { test as setup } from '@playwright/test';
import { createAdminSession } from './create-admin-session';

setup.describe.configure({ mode: 'serial' });

setup('create shared admin user', async ({ page }) => {
    await createAdminSession(page);
});
