import type { Page, Locator } from '@playwright/test';

export class AchievementsPage {
    readonly page: Page;
    readonly achievementsPage: Locator;
    readonly statsSection: Locator;
    readonly tabOrganization: Locator;
    readonly contentIndividual: Locator;
    readonly contentOrganization: Locator;

    constructor(page: Page) {
        this.page = page;
        this.achievementsPage = page.getByTestId('achievements-page');
        this.statsSection = page.getByTestId('achievements-stats');
        this.tabOrganization = page.getByTestId('achievements-tab-organization');
        this.contentIndividual = page.getByTestId('achievements-content-individual');
        this.contentOrganization = page.getByTestId('achievements-content-organization');
    }

    async goto() {
        for (let attempt = 0; attempt < 3; attempt++) {
            await this.page.goto('/dashboard/achievements', { waitUntil: 'domcontentloaded' });

            const result = await Promise.race([
                this.achievementsPage
                    .waitFor({ state: 'visible', timeout: 5000 })
                    .then(() => 'ready' as const)
                    .catch(() => 'timeout' as const),
                this.page
                    .getByRole('heading', { name: /this page couldn.t load/i })
                    .waitFor({ state: 'visible', timeout: 5000 })
                    .then(() => 'error' as const)
                    .catch(() => 'timeout' as const),
            ]);

            if (result === 'ready') {
                return;
            }

            await this.page.waitForTimeout(500);
        }
    }

    async switchToOrganization() {
        await this.tabOrganization.waitFor({ state: 'visible', timeout: 10000 });
        await this.tabOrganization.click({ force: true });
    }
}
