import { test as setup } from '@playwright/test';
import { generateTestUserData } from '../helpers/test-helpers';

const REGULAR_USER_FILE = 'tests/.auth/regular-user.json';
const ADMIN_USER_FILE = 'tests/.auth/admin-user.json';

const origin = process.env.BASE_URL || 'http://localhost:3000';
const headers = { Origin: origin };

setup('create shared regular user', async ({ page }) => {
    const userData = generateTestUserData();

    // Sign up via API
    const signUpResponse = await page.request.post('/api/auth/sign-up/email', {
        headers,
        data: {
            email: userData.email,
            password: userData.password,
            name: userData.username,
        },
    });

    if (!signUpResponse.ok()) {
        const body = await signUpResponse.text();
        throw new Error(`Sign-up failed (${signUpResponse.status()}): ${body}`);
    }

    // Create organization
    const createOrgResponse = await page.request.post('/api/auth/organization/create', {
        headers,
        data: {
            name: `${userData.username} Org`,
            slug: userData.organizationSlug,
        },
    });

    if (!createOrgResponse.ok()) {
        const body = await createOrgResponse.text();
        throw new Error(`Create org failed (${createOrgResponse.status()}): ${body}`);
    }

    const orgPayload = (await createOrgResponse.json()) as { id?: string; data?: { id?: string } };
    const orgId = orgPayload.id ?? orgPayload.data?.id;

    if (!orgId) {
        throw new Error('Create org did not return an organization ID');
    }

    // Set active organization
    const setActiveResponse = await page.request.post('/api/auth/organization/set-active', {
        headers,
        data: { organizationId: orgId },
    });

    if (!setActiveResponse.ok()) {
        const body = await setActiveResponse.text();
        throw new Error(`Set active org failed (${setActiveResponse.status()}): ${body}`);
    }

    // Navigate to dashboard to ensure cookies are fully set in the browser context
    await page.goto('/dashboard/home', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/dashboard\/home(\?|$)/, { timeout: 15000 });

    // Save storage state
    await page.context().storageState({ path: REGULAR_USER_FILE });
});

setup('create shared admin user', async ({ page }) => {
    const userData = generateTestUserData();

    // Sign up via API
    const signUpResponse = await page.request.post('/api/auth/sign-up/email', {
        headers,
        data: {
            email: userData.email,
            password: userData.password,
            name: userData.username,
        },
    });

    if (!signUpResponse.ok()) {
        const body = await signUpResponse.text();
        throw new Error(`Sign-up failed (${signUpResponse.status()}): ${body}`);
    }

    // Create organization
    const createOrgResponse = await page.request.post('/api/auth/organization/create', {
        headers,
        data: {
            name: `${userData.username} Org`,
            slug: userData.organizationSlug,
        },
    });

    if (!createOrgResponse.ok()) {
        const body = await createOrgResponse.text();
        throw new Error(`Create org failed (${createOrgResponse.status()}): ${body}`);
    }

    const orgPayload = (await createOrgResponse.json()) as { id?: string; data?: { id?: string } };
    const orgId = orgPayload.id ?? orgPayload.data?.id;

    if (!orgId) {
        throw new Error('Create org did not return an organization ID');
    }

    // Set active organization
    const setActiveResponse = await page.request.post('/api/auth/organization/set-active', {
        headers,
        data: { organizationId: orgId },
    });

    if (!setActiveResponse.ok()) {
        const body = await setActiveResponse.text();
        throw new Error(`Set active org failed (${setActiveResponse.status()}): ${body}`);
    }

    // Navigate to dashboard to ensure cookies are set
    await page.goto('/dashboard/home', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/dashboard\/home(\?|$)/, { timeout: 15000 });

    // Promote to admin (use page.request instead of page.evaluate to avoid
    // "Execution context was destroyed" errors from page navigations)
    const promoteResponse = await page.request.post('/api/test/promote-admin', {
        headers: { ...headers, 'Content-Type': 'application/json' },
    });

    if (!promoteResponse.ok()) {
        const body = await promoteResponse.text();
        throw new Error(`Promote admin failed (${promoteResponse.status()}): ${body}`);
    }

    // Reload to pick up admin state
    await page.reload({ waitUntil: 'domcontentloaded' });

    // Save storage state
    await page.context().storageState({ path: ADMIN_USER_FILE });
});
