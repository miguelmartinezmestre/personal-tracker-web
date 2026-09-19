import type { Page, Locator } from '@playwright/test';

export class AchievementsPage {
    readonly page: Page;
    readonly achievementsPage: Locator;
    readonly title: Locator;
    readonly statsSection: Locator;
    readonly totalPoints: Locator;
    readonly earnedCount: Locator;
    readonly filters: Locator;
    readonly filterAll: Locator;
    readonly filterEarned: Locator;
    readonly filterLocked: Locator;
    readonly tabs: Locator;
    readonly tabIndividual: Locator;
    readonly tabOrganization: Locator;
    readonly contentIndividual: Locator;
    readonly contentOrganization: Locator;
    readonly gridIndividual: Locator;
    readonly gridOrganization: Locator;

    constructor(page: Page) {
        this.page = page;
        this.achievementsPage = page.getByTestId('achievements-page');
        this.title = page.getByTestId('achievements-title');
        this.statsSection = page.getByTestId('achievements-stats');
        this.totalPoints = page.getByTestId('achievements-total-points');
        this.earnedCount = page.getByTestId('achievements-earned-count');
        this.filters = page.getByTestId('achievements-filters');
        this.filterAll = page.getByTestId('achievements-filter-all');
        this.filterEarned = page.getByTestId('achievements-filter-earned');
        this.filterLocked = page.getByTestId('achievements-filter-locked');
        this.tabs = page.getByTestId('achievements-tabs');
        this.tabIndividual = page.getByTestId('achievements-tab-individual');
        this.tabOrganization = page.getByTestId('achievements-tab-organization');
        this.contentIndividual = page.getByTestId('achievements-content-individual');
        this.contentOrganization = page.getByTestId('achievements-content-organization');
        this.gridIndividual = page.getByTestId('achievements-grid-individual');
        this.gridOrganization = page.getByTestId('achievements-grid-organization');
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

    async filterBy(filter: 'all' | 'earned' | 'locked') {
        const click = async (locator: Locator) => {
            await locator.waitFor({ state: 'visible', timeout: 10000 });
            await locator.evaluate(element => {
                if (element instanceof HTMLElement) {
                    element.click();
                }
            });
        };

        switch (filter) {
            case 'all':
                await click(this.filterAll);
                break;
            case 'earned':
                await click(this.filterEarned);
                break;
            case 'locked':
                await click(this.filterLocked);
                break;
        }
    }

    async switchToIndividual() {
        await this.tabIndividual.waitFor({ state: 'visible', timeout: 10000 });
        await this.tabIndividual.click({ force: true });
    }

    async switchToOrganization() {
        await this.tabOrganization.waitFor({ state: 'visible', timeout: 10000 });
        await this.tabOrganization.click({ force: true });
    }
}
