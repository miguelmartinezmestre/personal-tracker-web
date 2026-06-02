import { test, expect, type Page } from '@playwright/test';
import { createTestUser } from '../../helpers/test-helpers';

async function headersFromNavigation(page: Page, path = '/') {
    const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
    expect(response).not.toBeNull();
    return response!.headers();
}

test.describe('Security Headers', () => {
    test('should include Content-Security-Policy header', async ({ page }) => {
        const headers = await headersFromNavigation(page);

        const cspHeader = headers['content-security-policy'] || headers['Content-Security-Policy'];

        expect(cspHeader).toBeDefined();
        expect(cspHeader).toContain('default-src');
    });

    test('should include X-Frame-Options header', async ({ page }) => {
        const headers = await headersFromNavigation(page);

        const frameOptions = headers['x-frame-options'] || headers['X-Frame-Options'];

        expect(frameOptions).toBeDefined();
        expect(frameOptions?.toLowerCase()).toMatch(/deny|sameorigin/);
    });

    test('should include X-Content-Type-Options header', async ({ page }) => {
        const headers = await headersFromNavigation(page);

        const contentTypeOptions =
            headers['x-content-type-options'] || headers['X-Content-Type-Options'];

        expect(contentTypeOptions).toBeDefined();
        expect(contentTypeOptions?.toLowerCase()).toBe('nosniff');
    });

    test('should include Referrer-Policy header', async ({ page }) => {
        const headers = await headersFromNavigation(page);

        const referrerPolicy = headers['referrer-policy'] || headers['Referrer-Policy'];

        expect(referrerPolicy).toBeDefined();
    });

    test('should include Permissions-Policy header', async ({ page }) => {
        const headers = await headersFromNavigation(page);

        const permissionsPolicy =
            headers['permissions-policy'] ||
            headers['Permissions-Policy'] ||
            headers['feature-policy'] ||
            headers['Feature-Policy'];

        expect(permissionsPolicy).toBeDefined();
    });

    test('should set secure cookie attributes', async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();

        await createTestUser(page);

        const cookies = await context.cookies();

        for (const cookie of cookies) {
            if (
                cookie.name.toLowerCase().includes('session') ||
                cookie.name.toLowerCase().includes('auth')
            ) {
                expect(cookie.httpOnly).toBe(true);

                expect(cookie.secure).toBe(true);

                expect(['Lax', 'Strict', 'None']).toContain(cookie.sameSite);
            }
        }

        await context.close();
    });

    test('should not expose server information in headers', async ({ page }) => {
        const headers = await headersFromNavigation(page);

        const serverHeader = headers['server'] || headers['Server'];
        if (serverHeader) {
            expect(serverHeader).not.toMatch(/\d+\.\d+\.\d+/);
        }

        const poweredBy = headers['x-powered-by'] || headers['X-Powered-By'];
        expect(poweredBy).toBeUndefined();
    });

    test('should include HSTS header for HTTPS', async ({ page }) => {
        const headers = await headersFromNavigation(page);

        const hsts = headers['strict-transport-security'] || headers['Strict-Transport-Security'];

        expect(hsts).toBeDefined();
        expect(hsts).toContain('max-age');
        expect(hsts).toContain('includeSubDomains');
    });

    test('CSP should prevent inline script execution', async ({ page }) => {
        await page.goto('/');

        const result = await page.evaluate(() => {
            try {
                const script = document.createElement('script');
                script.textContent = 'window.cspTest = "executed";';
                document.head.appendChild(script);
                return (window as Window & { cspTest?: string }).cspTest;
            } catch {
                return 'blocked';
            }
        });

        expect(result).toBe('blocked');
    });

    test('should prevent clickjacking via X-Frame-Options', async ({ page }) => {
        const headers = await headersFromNavigation(page, '/login');

        const frameOptions = headers['x-frame-options'] || headers['X-Frame-Options'];

        expect(frameOptions).toBeDefined();
        expect(['DENY', 'SAMEORIGIN'].map(frameOption => frameOption.toLowerCase())).toContain(
            frameOptions!.toLowerCase()
        );
    });
});
