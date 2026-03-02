import { Page, Locator } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly sidebar: Locator;
  readonly signOutButton: Locator;
  readonly themeToggle: Locator;
  readonly languageSwitcher: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sidebar = page.locator('[data-sidebar]');
    this.signOutButton = page.getByTestId('sign-out-button');
    this.themeToggle = page.getByTestId('theme-toggle');
    this.languageSwitcher = page.getByTestId('language-switcher');
  }

  async gotoHome() {
    await this.page.goto('/dashboard/home');
  }

  async gotoObjectives() {
    await this.page.goto('/dashboard/objectives');
  }

  async gotoNotifications() {
    await this.page.goto('/dashboard/notifications');
  }

  async gotoSettings() {
    await this.page.goto('/dashboard/settings');
  }

  async signOut() {
    await this.signOutButton.click();
  }

  async expectOnDashboard() {
    await this.page.waitForURL(/\/dashboard/);
  }
}
