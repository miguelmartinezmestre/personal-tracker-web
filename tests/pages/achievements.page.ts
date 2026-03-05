import { Page, Locator } from '@playwright/test';

export class AchievementsPage {
    readonly page: Page;

    // Layout
    readonly achievementsPage: Locator;
    readonly title: Locator;

    // Stats
    readonly statsSection: Locator;
    readonly totalPoints: Locator;
    readonly earnedCount: Locator;

    // Filters
    readonly filters: Locator;
    readonly filterAll: Locator;
    readonly filterEarned: Locator;
    readonly filterLocked: Locator;

    // Tabs
    readonly tabs: Locator;
    readonly tabIndividual: Locator;
    readonly tabOrganization: Locator;
    readonly contentIndividual: Locator;
    readonly contentOrganization: Locator;
    readonly gridIndividual: Locator;
    readonly gridOrganization: Locator;

    // Seed button
    readonly seedButton: Locator;

    constructor(page: Page) {
        this.page = page;

        // Layout
        this.achievementsPage = page.getByTestId('achievements-page');
        this.title = page.getByTestId('achievements-title');

        // Stats
        this.statsSection = page.getByTestId('achievements-stats');
        this.totalPoints = page.getByTestId('achievements-total-points');
        this.earnedCount = page.getByTestId('achievements-earned-count');

        // Filters
        this.filters = page.getByTestId('achievements-filters');
        this.filterAll = page.getByTestId('achievements-filter-all');
        this.filterEarned = page.getByTestId('achievements-filter-earned');
        this.filterLocked = page.getByTestId('achievements-filter-locked');

        // Tabs
        this.tabs = page.getByTestId('achievements-tabs');
        this.tabIndividual = page.getByTestId('achievements-tab-individual');
        this.tabOrganization = page.getByTestId('achievements-tab-organization');
        this.contentIndividual = page.getByTestId('achievements-content-individual');
        this.contentOrganization = page.getByTestId('achievements-content-organization');
        this.gridIndividual = page.getByTestId('achievements-grid-individual');
        this.gridOrganization = page.getByTestId('achievements-grid-organization');

        // Seed button
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
