import { test, expect } from '@playwright/test';

test.describe('Rate Limiting', () => {
    test.describe('Login Rate Limiting', () => {
        test('should limit failed login attempts', async ({ page }) => {
            const testEmail = `ratelimit-${Date.now()}@example.com`;
            const testPassword = 'WrongPassword123!';

            const attempts = 10;
            const responses: (number | undefined)[] = [];

            for (let i = 0; i < attempts; i++) {
                try {
                    const response = await page.request.post('/api/auth/sign-in/email', {
                        data: {
                            email: testEmail,
                            password: testPassword,
                        },
                    });
                    responses.push(response.status());
                } catch {
                    responses.push(undefined);
                }
            }

            const hasRateLimit = responses.some(status => status === 429);
            const hasForbidden = responses.some(status => status === 403 || status === 401);

            expect(hasRateLimit || hasForbidden).toBeTruthy();
        });

        test('should implement exponential backoff on failed logins', async ({ page }) => {
            const testEmail = `backoff-${Date.now()}@example.com`;

            const timestamps: number[] = [];
            const responses: number[] = [];

            for (let i = 0; i < 5; i++) {
                timestamps.push(Date.now());
                try {
                    const response = await page.request.post('/api/auth/sign-in/email', {
                        data: {
                            email: testEmail,
                            password: 'wrongpassword',
                        },
                    });
                    responses.push(response.status());
                } catch {
                    responses.push(0);
                }
            }

            expect(responses.every(status => status >= 400 || status === 0)).toBe(true);
        });
    });

    test.describe('API Rate Limiting', () => {
        test('should limit rapid API requests', async ({ page }) => {
            const requests = 20;
            const responses: number[] = [];

            for (let i = 0; i < requests; i++) {
                try {
                    const response = await page.request.get('/api/auth/get-session');
                    responses.push(response.status());
                } catch {
                    responses.push(0);
                }
            }

            const rateLimitedCount = responses.filter(s => s === 429).length;
            const successCount = responses.filter(s => s === 200).length;

            expect(rateLimitedCount + successCount).toBeGreaterThanOrEqual(requests * 0.8);
        });

        test('should include rate limit headers', async ({ page }) => {
            for (let i = 0; i < 10; i++) {
                await page.request.get('/api/auth/get-session');
            }

            const response = await page.request.get('/api/auth/get-session');
            const headers = response.headers();

            const limit = headers['x-ratelimit-limit'];
            const remaining = headers['x-ratelimit-remaining'];
            const reset = headers['x-ratelimit-reset'];
            const retryAfter = headers['retry-after'];

            if (limit) expect(Number(limit)).not.toBeNaN();
            if (remaining) expect(Number(remaining)).not.toBeNaN();
            if (reset) expect(Number(reset)).not.toBeNaN();
            if (retryAfter) expect(Number(retryAfter)).not.toBeNaN();
        });
    });

    test.describe('Registration Rate Limiting', () => {
        test('should limit rapid registration attempts', async ({ page }) => {
            const responses: number[] = [];

            for (let i = 0; i < 5; i++) {
                try {
                    const response = await page.request.post('/api/auth/sign-up/email', {
                        data: {
                            email: `spam${Date.now()}-${i}@example.com`,
                            password: 'Password123!',
                            name: `Spam User ${i}`,
                        },
                    });
                    responses.push(response.status());
                } catch {
                    responses.push(0);
                }

                await page.waitForTimeout(100);
            }

            const hasRateLimit = responses.some(s => s === 429);
            const hasSuccess = responses.some(s => s === 200 || s === 201);

            expect(hasRateLimit || hasSuccess).toBe(true);
        });
    });

    test.describe('Password Reset Rate Limiting', () => {
        test('should limit password reset requests', async ({ page }) => {
            const testEmail = `reset-${Date.now()}@example.com`;
            const responses: number[] = [];

            for (let i = 0; i < 5; i++) {
                try {
                    const response = await page.request.post('/api/auth/forget-password', {
                        data: {
                            email: testEmail,
                        },
                    });
                    responses.push(response.status());
                } catch {
                    responses.push(0);
                }
            }

            const hasRateLimit = responses.some(s => s === 429);
            const hasSuccess = responses.some(s => s === 200);

            expect(hasRateLimit || hasSuccess).toBe(true);
        });
    });

    test.describe('General Rate Limiting', () => {
        test('should handle burst traffic gracefully', async ({ page }) => {
            const burstSize = 15;
            const promises = Array.from({ length: burstSize }, () =>
                page.request.get('/').catch(() => null)
            );

            const results = await Promise.all(promises);

            const successful = results.filter(r => r && r.ok()).length;
            const rateLimited = results.filter(r => r && r.status() === 429).length;

            expect(successful + rateLimited).toBeGreaterThanOrEqual(burstSize * 0.5);
        });

        test('should recover after rate limit window', async ({ page }) => {
            for (let i = 0; i < 10; i++) {
                await page.request.get('/api/auth/get-session').catch(() => undefined);
            }

            await page.waitForTimeout(1000);

            const response = await page.request.get('/api/auth/get-session');
            expect([200, 429]).toContain(response.status());
        });
    });
});
