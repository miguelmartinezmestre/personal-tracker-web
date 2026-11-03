import { expect, test } from '@playwright/test';

test(
    'production responses apply nonce CSP and defensive headers',
    { tag: ['@REQ-NF-003', '@INH-SEG-02', '@security'] },
    async ({ page }) => {
        const response = await page.goto('/login');
        expect(response).not.toBeNull();
        const headers = response?.headers() ?? {};
        const csp = headers['content-security-policy'] ?? '';
        expect(csp).toContain("default-src 'self'");
        expect(csp).toMatch(/script-src[^;]*'nonce-[^']+'/);
        expect(csp).not.toContain("'unsafe-eval'");
        expect(csp).toContain("frame-ancestors 'none'");
        expect(headers['x-content-type-options']).toBe('nosniff');
        expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
        expect(headers['permissions-policy']).toBeTruthy();

        const nonces = await page
            .locator('script[nonce]')
            .evaluateAll(scripts =>
                scripts.map(script => (script instanceof HTMLScriptElement ? script.nonce : ''))
            );

        expect(nonces.length).toBeGreaterThan(0);
        expect(nonces.every(nonce => nonce.length > 0 && csp.includes(`'nonce-${nonce}'`))).toBe(
            true
        );
    }
);
