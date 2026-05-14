import { type Page } from '@playwright/test';

export function attachPageDiagnostics(page: Page, label: string): void {
    if (process.env.E2E_DEBUG_PAGE_ERRORS !== 'true') {
        return;
    }

    page.on('pageerror', error => {
        console.error(`[pageerror:${label}] ${error.stack ?? error.message}`);
    });

    page.on('console', message => {
        if (message.type() !== 'error') {
            return;
        }

        console.error(`[console:${label}] ${message.text()}`);
    });
}
