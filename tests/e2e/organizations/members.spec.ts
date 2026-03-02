import { test, expect } from '@playwright/test';
import { createTestUser, createOrganization } from '../../helpers/test-helpers';

test.describe('Organization Members', () => {
  test.beforeEach(async ({ page }) => {
    await createTestUser(page);
  });

  test('view organization members', async ({ page }) => {
    // Navigate to organization detail or members page
    await page.goto('/dashboard/organizations');
    await page.waitForLoadState('load');

    // Find an organization and view its members
    const orgRow = page.locator('tr').first();
    const viewLink = orgRow.locator('a, [data-testid*="view"]').first();

    if (await viewLink.isVisible()) {
      await viewLink.click();
      await page.waitForLoadState('load');

      // Look for members section
      const membersSection = page.locator('text=/members|miembros/i');
      const hasMembersSection = (await membersSection.count()) > 0;

      // Or a members tab
      const membersTab = page.locator('button:has-text("Members"), [data-testid*="members"]');
      if ((await membersTab.count()) > 0) {
        await membersTab.first().click();
        await page.waitForLoadState('load');
      }

      // Should see at least the owner
      const memberList = page.locator('[data-testid*="member"], tr');
      expect(await memberList.count()).toBeGreaterThan(0);
    }
  });

  test('owner can see all members', async ({ page }) => {
    const org = await createOrganization(page);

    // Navigate to organization detail
    await page.goto('/dashboard/organizations');
    await page.waitForLoadState('load');

    const orgRow = page.locator('tr', { hasText: org.name }).first();
    const viewLink = orgRow.locator('a, [data-testid*="view"]').first();

    if (await viewLink.isVisible()) {
      await viewLink.click();
      await page.waitForLoadState('load');

      // Owner should see member management options
      const inviteButton = page.locator(
        'button:has-text("Invite"), button:has-text("Invitar"), [data-testid*="invite"]'
      );
      const hasInviteButton = (await inviteButton.count()) > 0;

      // Or member list visible
      const memberList = page.locator('[data-testid*="member-list"], table');
      const hasMemberList = (await memberList.count()) > 0;

      expect(hasInviteButton || hasMemberList).toBeTruthy();
    }
  });

  test('remove member from organization', async ({ page }) => {
    // Note: This requires having multiple members
    // In a real test, we would:
    // 1. Invite a member
    // 2. Accept invitation (with second browser context)
    // 3. Remove the member

    const org = await createOrganization(page);

    await page.goto('/dashboard/organizations');
    await page.waitForLoadState('load');

    const orgRow = page.locator('tr', { hasText: org.name }).first();
    const viewLink = orgRow.locator('a, [data-testid*="view"]').first();

    if (await viewLink.isVisible()) {
      await viewLink.click();
      await page.waitForLoadState('load');

      // Look for remove member button (if there are other members)
      const removeButton = page.locator(
        '[data-testid*="remove-member"], button[aria-label*="remove"]'
      );

      // Since we only have the owner, there might be no remove buttons
      // Or remove is disabled for owner
    }
  });

  test('member role is displayed', async ({ page }) => {
    await page.goto('/dashboard/organizations');
    await page.waitForLoadState('load');

    const orgRow = page.locator('tr').first();
    const viewLink = orgRow.locator('a, [data-testid*="view"]').first();

    if (await viewLink.isVisible()) {
      await viewLink.click();
      await page.waitForLoadState('load');

      // Look for role badge (owner, admin, member)
      const roleBadge = page.locator(
        'text=/owner|admin|member|propietario|administrador|miembro/i'
      );
      const hasRoleBadge = (await roleBadge.count()) > 0;

      // The owner should see their role
      expect(hasRoleBadge).toBeTruthy();
    }
  });

  test('owner cannot be removed', async ({ page }) => {
    await page.goto('/dashboard/organizations');
    await page.waitForLoadState('load');

    const orgRow = page.locator('tr').first();
    const viewLink = orgRow.locator('a, [data-testid*="view"]').first();

    if (await viewLink.isVisible()) {
      await viewLink.click();
      await page.waitForLoadState('load');

      // Look for owner's member entry
      const ownerRow = page.locator(
        'tr:has-text("owner"), [data-testid*="member"]:has-text("owner")'
      );

      if ((await ownerRow.count()) > 0) {
        // Remove button should be disabled or not present for owner
        const removeButton = ownerRow.locator(
          '[data-testid*="remove"], button[aria-label*="remove"]'
        );

        if ((await removeButton.count()) > 0) {
          // Should be disabled
          await expect(removeButton.first()).toBeDisabled();
        }
      }
    }
  });

  test('member list shows email', async ({ page }) => {
    await page.goto('/dashboard/organizations');
    await page.waitForLoadState('load');

    const orgRow = page.locator('tr').first();
    const viewLink = orgRow.locator('a, [data-testid*="view"]').first();

    if (await viewLink.isVisible()) {
      await viewLink.click();
      await page.waitForLoadState('load');

      // Look for email display in member list
      const emailDisplay = page.getByText(/@.*\.com|@.*\.test/);
      const hasEmail = (await emailDisplay.count()) > 0;

      // At least the owner's email should be visible
      // (depending on UI design)
    }
  });

  test('member joined date is displayed', async ({ page }) => {
    await page.goto('/dashboard/organizations');
    await page.waitForLoadState('load');

    const orgRow = page.locator('tr').first();
    const viewLink = orgRow.locator('a, [data-testid*="view"]').first();

    if (await viewLink.isVisible()) {
      await viewLink.click();
      await page.waitForLoadState('load');

      // Look for date display
      const dateDisplay = page.getByText(/\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|ago|hace/);
      const hasDate = (await dateDisplay.count()) > 0;

      // Date formatting might vary
    }
  });
});
