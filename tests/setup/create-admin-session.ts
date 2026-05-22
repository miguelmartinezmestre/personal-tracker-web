import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { type Page } from '@playwright/test';
import { generateTestUserData } from '../helpers/test-helpers';

const ADMIN_USER_FILE = 'tests/.auth/admin-user.json';
const origin = process.env.BASE_URL || 'http://localhost:3000';
const headers = { Origin: origin };

async function setActiveOrganizationViaBrowser(
    page: Page,
    organizationId: string
): Promise<boolean> {
    try {
        return await page.evaluate(async id => {
            const response = await fetch('/api/auth/organization/set-active', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ organizationId: id }),
            });

            return response.ok;
        }, organizationId);
    } catch {
        return false;
    }
}

async function waitForAdminDashboardReady(page: Page): Promise<void> {
    const deadline = Date.now() + 15_000;
    const diagnostics: string[] = [];
    const pushDiagnostic = (message: string) => {
        diagnostics.push(message);
        if (diagnostics.length > 12) {
            diagnostics.shift();
        }
    };
    const onPageError = (error: Error) => {
        pushDiagnostic(`pageerror: ${error.message}`);
    };
    const onConsole = (message: { type(): string; text(): string }) => {
        if (message.type() === 'error') {
            pushDiagnostic(`console: ${message.text()}`);
        }
    };
    const onResponse = (response: { status(): number; url(): string }) => {
        if (response.status() >= 500) {
            pushDiagnostic(`response ${response.status()}: ${response.url()}`);
        }
    };

    page.on('pageerror', onPageError);
    page.on('console', onConsole);
    page.on('response', onResponse);

    try {
        while (Date.now() < deadline) {
            try {
                await page.goto('/dashboard/home', { waitUntil: 'domcontentloaded' });

                const currentUrl = page.url();
                if (!/\/dashboard\/home(\?|$)/.test(currentUrl)) {
                    await page.waitForTimeout(500);
                    continue;
                }

                const switcher = page.getByTestId('organization-switcher');
                if ((await switcher.count()) > 0) {
                    const text = ((await switcher.first().textContent()) ?? '').toLowerCase();
                    if (!text.includes('no organization') && !text.includes('sin organizacion')) {
                        return;
                    }
                }
            } catch (error) {
                if (error instanceof Error) {
                    pushDiagnostic(`wait error: ${error.message}`);
                }
            }

            await page.waitForTimeout(500);
        }

        throw new Error(
            `Admin session did not reach a ready dashboard state. ${diagnostics.join(' | ')}`
        );
    } finally {
        page.off('pageerror', onPageError);
        page.off('console', onConsole);
        page.off('response', onResponse);
    }
}

export async function createAdminSession(page: Page): Promise<void> {
    const userData = generateTestUserData();

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

    const setActiveResponse = await page.request.post('/api/auth/organization/set-active', {
        headers,
        data: { organizationId: orgId },
    });

    if (!setActiveResponse.ok()) {
        const body = await setActiveResponse.text();
        throw new Error(`Set active org failed (${setActiveResponse.status()}): ${body}`);
    }

    const setupResponse = await page.request.post('/api/test/setup-platform', {
        headers: { ...headers, 'Content-Type': 'application/json' },
        data: JSON.stringify({}),
    });

    if (!setupResponse.ok()) {
        const body = await setupResponse.text();
        throw new Error(`Setup platform failed (${setupResponse.status()}): ${body}`);
    }

    await page.goto('/dashboard/home', { waitUntil: 'domcontentloaded' });
    await setActiveOrganizationViaBrowser(page, orgId);
    await waitForAdminDashboardReady(page);

    await mkdir(dirname(ADMIN_USER_FILE), { recursive: true });
    await page.context().storageState({ path: ADMIN_USER_FILE });
}
