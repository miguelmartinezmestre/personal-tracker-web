import { Page, Locator } from '@playwright/test';

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
    readonly seedButton: Locator;

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
        this.seedButton = page.getByTestId('achievements-seed-button');
    }

    async goto() {
        await this.page.goto('/dashboard/achievements');
    }

    async filterBy(filter: 'all' | 'earned' | 'locked') {
        switch (filter) {
            case 'all':
                await this.filterAll.click();
                break;
            case 'earned':
                await this.filterEarned.click();
                break;
            case 'locked':
                await this.filterLocked.click();
                break;
        }
    }

    async switchToIndividual() {
        await this.tabIndividual.click();
    }

    async switchToOrganization() {
        await this.tabOrganization.click();
    }
}
