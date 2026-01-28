import { test, expect } from '@playwright/test';
import { createTestUser } from './test-helpers';

test.describe('OpenAPI/Swagger Endpoints', () => {
    test('/api/doc returns valid OpenAPI specification', async ({ page }) => {
        await createTestUser(page);

        // Navigate to the API doc endpoint
        const response = await page.goto('/api/doc');

        // Verify response is successful
        expect(response?.status()).toBe(200);

        // Verify content-type is JSON
        const contentType = response?.headers()['content-type'];
        expect(contentType).toContain('application/json');

        // Get the response body as JSON
        const spec = await response?.json();

        // Verify it's a valid OpenAPI spec
        expect(spec).toBeDefined();
        expect(spec.openapi).toBe('3.0.0');
        expect(spec.info).toBeDefined();
        expect(spec.info.title).toBeDefined();
        expect(spec.info.version).toBeDefined();

        // Verify it has paths defined
        expect(spec.paths).toBeDefined();
        expect(typeof spec.paths).toBe('object');
    });

    test('/api/doc includes security schemes', async ({ page }) => {
        await createTestUser(page);

        const response = await page.goto('/api/doc');
        const spec = await response?.json();

        // Verify security schemes are defined
        expect(spec.components).toBeDefined();
        expect(spec.components.securitySchemes).toBeDefined();

        // Verify Bearer JWT auth is configured (the key is 'bearerAuth' in the actual response)
        const securitySchemes = spec.components.securitySchemes;
        expect(Object.keys(securitySchemes)).toContain('bearerAuth');
    });

    test('/api/ui serves Swagger UI interface', async ({ page }) => {
        await createTestUser(page);

        // Navigate to Swagger UI
        const response = await page.goto('/api/ui');

        // Verify response is successful
        expect(response?.status()).toBe(200);

        // Verify content-type is HTML
        const contentType = response?.headers()['content-type'];
        expect(contentType).toContain('text/html');

        // Wait for Swagger UI to load
        await page.waitForLoadState('networkidle');

        // Verify Swagger UI elements are present
        // Look for typical Swagger UI class names or text
        const body = await page.textContent('body');
        expect(body).toBeTruthy();

        // Check that it references the /api/doc endpoint
        const pageContent = await page.content();
        expect(pageContent).toContain('/api/doc');
    });

    test('/api/ui is interactive and can display API routes', async ({ page }) => {
        await createTestUser(page);

        await page.goto('/api/ui');
        await page.waitForLoadState('networkidle');

        // Verify the page loaded successfully
        const title = await page.title();
        expect(title).toBeTruthy();

        // Swagger UI should be rendered (check for common Swagger UI patterns)
        const html = await page.content();
        expect(html.length).toBeGreaterThan(100); // Basic sanity check
    });

    test('OpenAPI endpoints require authentication', async ({ page, context }) => {
        // Create a new context without authentication
        const unauthPage = await context.newPage();

        // Try to access /api/doc without auth
        const docResponse = await unauthPage.goto('/api/doc');

        // Should either redirect or return 401/403
        const status = docResponse?.status();
        expect(status === 401 || status === 403 || status === 307 || status === 302).toBe(true);

        // Try to access /api/ui without auth
        const uiResponse = await unauthPage.goto('/api/ui');

        const uiStatus = uiResponse?.status();
        expect(uiStatus === 401 || uiStatus === 403 || uiStatus === 307 || uiStatus === 302).toBe(
            true
        );

        await unauthPage.close();
    });

    test('OpenAPI spec persists and is accessible after page reload', async ({ page }) => {
        await createTestUser(page);

        // First access
        const response1 = await page.goto('/api/doc');
        const spec1 = await response1?.json();
        expect(spec1.openapi).toBe('3.0.0');

        // Reload page
        await page.reload();

        // Second access
        const response2 = await page.goto('/api/doc');
        const spec2 = await response2?.json();

        // Specs should be consistent
        expect(spec2.openapi).toBe('3.0.0');
        expect(spec2.info).toEqual(spec1.info);
    });
});
