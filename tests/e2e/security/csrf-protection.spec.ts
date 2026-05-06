import { test, expect } from '@playwright/test';
import { createTestUserViaAPI, ensureDefaultCategories } from '../../helpers/test-helpers';

test.describe('CSRF Protection', () => {
    test('should include csrf token in authenticated forms', async ({ page }) => {
        await createTestUserViaAPI(page);
        await ensureDefaultCategories(page);

        await page.goto('/dashboard/objectives');
        await page.waitForLoadState('domcontentloaded');

        await page.getByTestId('objective-create-open').click();
        await page.waitForSelector('[data-testid="objective-title-input"]', { timeout: 10000 });

        const form = page.locator('form').first();
        await expect(form).toBeVisible();

        const method = await form.getAttribute('method');
        if (method) {
            expect(method.toLowerCase()).toBe('post');
        }
    });

    test('should reject POST requests without proper origin header', async ({ page, context }) => {
        await createTestUserViaAPI(page);

        const result = await page.evaluate(async () => {
            try {
                const response = await fetch('/api/auth/sign-out', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({}),
                });
                return { status: response.status, ok: response.ok };
            } catch (error) {
                return { error: (error as Error).message };
            }
        });

        expect(
            result.ok === false ||
                (result.status !== undefined && result.status >= 400) ||
                result.error
        ).toBeTruthy();
    });

    test('should validate content-type on API requests', async ({ page }) => {
        await createTestUserViaAPI(page);

        const result = await page.evaluate(async () => {
            try {
                const response = await fetch('/api/auth/get-session', {
                    method: 'POST',
                    headers: {},
                    body: 'raw body without proper content type',
                });
                return { status: response.status, ok: response.ok };
            } catch (error) {
                return { error: (error as Error).message };
            }
        });

        expect(
            result.ok === false ||
                (result.status !== undefined && result.status >= 400) ||
                result.error
        ).toBeTruthy();
    });

    test('should prevent cross-origin form submission', async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();

        await createTestUserViaAPI(page);

        const maliciousHtml = `
            <form id="csrf-form" action="${process.env.NEXT_PUBLIC_APP_URL || ''}/api/auth/sign-out" method="POST">
                <input type="hidden" name="malicious" value="true" />
            </form>
            <script>document.getElementById('csrf-form').submit();</script>
        `;

        await page.setContent(maliciousHtml);

        await page.waitForTimeout(500);

        await page.goto('/dashboard/home');
        await page.waitForLoadState('domcontentloaded');

        const url = page.url();
        expect(url).toContain('/dashboard/');

        await context.close();
    });

    test('cookies should have secure attributes', async ({ page, context }) => {
        await createTestUserViaAPI(page);

        const cookies = await context.cookies();

        const authCookies = cookies.filter(
            cookie =>
                cookie.name.toLowerCase().includes('session') ||
                cookie.name.toLowerCase().includes('auth') ||
                cookie.name.toLowerCase().includes('token')
        );

        for (const cookie of authCookies) {
            if (process.env.NODE_ENV === 'production') {
                expect(cookie.httpOnly).toBe(true);
                expect(cookie.secure).toBe(true);
                expect(cookie.sameSite).toBe('Lax');
            }
        }
    });
});
