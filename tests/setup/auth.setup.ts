import { type Page, test as setup } from '@playwright/test';
import { generateTestUserData } from '../helpers/test-helpers';

const REGULAR_USER_FILE = 'tests/.auth/regular-user.json';
const ADMIN_USER_FILE = 'tests/.auth/admin-user.json';

const origin = process.env.BASE_URL || 'http://localhost:3000';
const headers = { Origin: origin };

interface CreateUserSessionOpts {
    setupPlatform?: boolean;
    storageStatePath: string;
}

async function createUserSession(page: Page, opts: CreateUserSessionOpts) {
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

    // Complete platform setup BEFORE navigating to dashboard (the dashboard layout
    // redirects to /setup when platformSettings doesn't exist yet)
    if (opts.setupPlatform) {
        const setupResponse = await page.request.post('/api/test/setup-platform', {
            headers: { ...headers, 'Content-Type': 'application/json' },
            data: JSON.stringify({}),
        });

        if (!setupResponse.ok()) {
            const body = await setupResponse.text();
            throw new Error(`Setup platform failed (${setupResponse.status()}): ${body}`);
        }
    }

    // Navigate to dashboard to ensure cookies are set
    await page.goto('/dashboard/home', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/dashboard\/home(\?|$)/, { timeout: 15000 });

    // Save storage state
    await page.context().storageState({ path: opts.storageStatePath });
}

// Force serial execution: admin must be created FIRST (with only 1 user in DB)
// so that setup-platform succeeds, before the regular user is registered.
setup.describe.configure({ mode: 'serial' });

setup('create shared admin user', async ({ page }) => {
    await createUserSession(page, { setupPlatform: true, storageStatePath: ADMIN_USER_FILE });
});

setup('create shared regular user', async ({ page }) => {
    await createUserSession(page, { storageStatePath: REGULAR_USER_FILE });
});
