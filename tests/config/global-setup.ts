import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
    const baseURL = config.projects?.[0]?.use?.baseURL || 'http://localhost:3000';
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    let attempts = 0;
    const maxAttempts = 5;

    try {
        while (attempts < maxAttempts) {
            try {
                await page.goto(`${baseURL}`, {
                    timeout: 3000,
                    waitUntil: 'domcontentloaded',
                });

                await page.goto(`${baseURL}/login`, {
                    timeout: 1500,
                    waitUntil: 'domcontentloaded',
                });

                break;
            } catch {
                attempts++;
                await new Promise(resolve => setTimeout(resolve, 750));
            }
        }

        if (attempts >= maxAttempts) {
            throw new Error('Backend did not become ready in time during global setup');
        }
    } finally {
        await browser.close();
    }
}

export default globalSetup;
