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
                // Check if the Next.js app responds
                await page.goto(`${baseURL}`, {
                    timeout: 5000,
                    waitUntil: 'domcontentloaded',
                });

                // Also verify the auth endpoint is responsive
                await page.goto(`${baseURL}/api/auth`, {
                    timeout: 2000,
                    waitUntil: 'domcontentloaded',
                });

                console.log('✅ Backend server is ready');
                break;
            } catch {
                attempts++;
                console.log(`⏳ Waiting for backend... attempt ${attempts}/${maxAttempts}`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        if (attempts >= maxAttempts) {
            console.warn('⚠️ Backend might not be fully ready, but proceeding with tests');
        }

        // Verify Convex is responding (optional check)
        try {
            const response = await page.evaluate(async () => {
                const res = await fetch('/api/auth');
                return res.status;
            });
            console.log(`✅ API auth endpoint responded with status: ${response}`);
        } catch (error) {
            console.warn('⚠️ Could not verify API endpoint, proceeding anyway');
        }
    } catch (error) {
        console.error('❌ Global setup failed:', error);
    } finally {
        await browser.close();
    }
}

export default globalSetup;
