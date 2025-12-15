import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
    console.log('🚀 Starting global setup for Playwright tests');

    const baseURL = config.projects?.[0]?.use?.baseURL || 'http://localhost:3000';
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        console.log('📡 Checking if backend is ready...');

        // Wait for the backend to be ready
        let attempts = 0;
        const maxAttempts = 30;

        while (attempts < maxAttempts) {
            try {
                const response = await page.goto(`${baseURL}/api/auth`, {
                    timeout: 2000,
                    waitUntil: 'domcontentloaded',
                });

                // If we get any response (even error), the server is running
                console.log('✅ Backend server is ready');
                break;
            } catch (error) {
                attempts++;
                console.log(`⏳ Waiting for backend... attempt ${attempts}/${maxAttempts}`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        if (attempts >= maxAttempts) {
            console.warn('⚠️ Backend might not be fully ready, but proceeding with tests');
        }
    } catch (error) {
        console.error('❌ Global setup failed:', error);
    } finally {
        await browser.close();
    }
}

export default globalSetup;
