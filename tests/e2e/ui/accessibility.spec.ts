import { AxeBuilder } from '@axe-core/playwright';
import { test, expect } from '../../fixtures/test-base';

const routes = ['home', 'organizations', 'invitations'] as const;

for (const theme of ['light', 'dark'] as const) {
    for (const route of routes) {
        test(
            `${route} has no serious or critical accessibility violations in ${theme}`,
            { tag: ['@accessibility'] },
            async ({ page }, testInfo) => {
                await page.addInitScript(
                    selectedTheme => localStorage.setItem('theme', selectedTheme),
                    theme
                );
                await page.goto(`/dashboard/${route}`);
                await expect(page.locator('html')).toHaveClass(new RegExp(theme));
                await expect(page.getByRole('main')).toHaveCount(1);
                await expect(page.getByRole('main')).toBeVisible();
                await expect(page.locator('[data-slot="skeleton"]:visible')).toHaveCount(0);
                const result = await new AxeBuilder({ page })
                    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'])
                    .analyze();
                await testInfo.attach(`axe-${route}-${theme}`, {
                    body: JSON.stringify(result, null, 2),
                    contentType: 'application/json',
                });
                const severe = result.violations.filter(
                    violation => violation.impact === 'serious' || violation.impact === 'critical'
                );
                expect(severe).toEqual([]);
            }
        );
    }
}

test(
    'keyboard skip link focuses the main content',
    { tag: ['@accessibility'] },
    async ({ page }) => {
        await page.goto('/dashboard/home');
        const main = page.getByRole('main');
        await expect(main).toBeVisible();
        await expect(page.locator('[data-slot="skeleton"]:visible')).toHaveCount(0);
        await page.keyboard.press('Tab');
        await expect(page.getByTestId('skip-to-content')).toBeFocused();
        await page.keyboard.press('Enter');
        await expect(main).toBeFocused();
    }
);
