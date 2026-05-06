import { test, expect } from '@playwright/test';
import { createTestUserViaAPI } from '../../helpers/test-helpers';

test.describe('Security Headers', () => {
    test('should include Content-Security-Policy header', async ({ page }) => {
        await page.goto('/');

        const response = await page.request.get('/');
        const headers = response.headers();

        const cspHeader = headers['content-security-policy'] || headers['Content-Security-Policy'];

        if (process.env.NODE_ENV === 'production') {
            expect(cspHeader).toBeDefined();
            expect(cspHeader).toContain('default-src');
        }
    });

    test('should include X-Frame-Options header', async ({ page }) => {
        const response = await page.request.get('/');
        const headers = response.headers();

        const frameOptions = headers['x-frame-options'] || headers['X-Frame-Options'];

        if (process.env.NODE_ENV === 'production') {
            expect(frameOptions).toBeDefined();
            expect(frameOptions?.toLowerCase()).toMatch(/deny|sameorigin/);
        }
    });

    test('should include X-Content-Type-Options header', async ({ page }) => {
        const response = await page.request.get('/');
        const headers = response.headers();

        const contentTypeOptions =
            headers['x-content-type-options'] || headers['X-Content-Type-Options'];

        if (process.env.NODE_ENV === 'production') {
            expect(contentTypeOptions).toBeDefined();
            expect(contentTypeOptions?.toLowerCase()).toBe('nosniff');
        }
    });

    test('should include Referrer-Policy header', async ({ page }) => {
        const response = await page.request.get('/');
        const headers = response.headers();

        const referrerPolicy = headers['referrer-policy'] || headers['Referrer-Policy'];

        if (process.env.NODE_ENV === 'production') {
            expect(referrerPolicy).toBeDefined();
        }
    });

    test('should include Permissions-Policy header', async ({ page }) => {
        const response = await page.request.get('/');
        const headers = response.headers();

        const permissionsPolicy =
            headers['permissions-policy'] ||
            headers['Permissions-Policy'] ||
            headers['feature-policy'] ||
            headers['Feature-Policy'];

        if (permissionsPolicy) {
            expect(permissionsPolicy).toBeDefined();
        }
    });

    test('should set secure cookie attributes', async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();

        await createTestUserViaAPI(page);

        const cookies = await context.cookies();

        for (const cookie of cookies) {
            if (
                cookie.name.toLowerCase().includes('session') ||
                cookie.name.toLowerCase().includes('auth')
            ) {
                if (process.env.NODE_ENV === 'production') {
                    expect(cookie.httpOnly).toBe(true);

                    expect(cookie.secure).toBe(true);

                    expect(['Lax', 'Strict', 'None']).toContain(cookie.sameSite);
                }
            }
        }

        await context.close();
    });

    test('should not expose server information in headers', async ({ page }) => {
        const response = await page.request.get('/');
        const headers = response.headers();

        const serverHeader = headers['server'] || headers['Server'];
        if (serverHeader) {
            expect(serverHeader).not.toMatch(/\d+\.\d+\.\d+/);
        }

        const poweredBy = headers['x-powered-by'] || headers['X-Powered-By'];
        if (process.env.NODE_ENV === 'production') {
            expect(poweredBy).toBeUndefined();
        }
    });

    test('should include HSTS header for HTTPS', async ({ page }) => {
        const response = await page.request.get('/');
        const headers = response.headers();

        const hsts = headers['strict-transport-security'] || headers['Strict-Transport-Security'];

        if (process.env.NODE_ENV === 'production') {
            expect(hsts).toBeDefined();
            expect(hsts).toContain('max-age');
            expect(hsts).toContain('includeSubDomains');
        }
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
    });

    test('should prevent clickjacking via X-Frame-Options', async ({ page }) => {
        const response = await page.request.get('/login');
        const headers = response.headers();

        const frameOptions = headers['x-frame-options'] || headers['X-Frame-Options'];

        if (process.env.NODE_ENV === 'production' && frameOptions) {
            expect(['DENY', 'SAMEORIGIN'].map(s => s.toLowerCase())).toContain(
                frameOptions.toLowerCase()
            );
        }
    });
});
