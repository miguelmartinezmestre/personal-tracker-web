import { AxeBuilder } from '@axe-core/playwright';
import { test, expect } from '../../fixtures/test-base';

const routes = [
    'home',
    'objectives',
    'categories',
    'organizations',
    'settings',
    'notifications',
    'sessions',
    'achievements',
] as const;

for (const theme of ['light', 'dark'] as const) {
    test(
        `the main routes have no serious or critical accessibility violations in ${theme}`,
        { tag: ['@accessibility', '@REQ-NF-009', '@mobile-critical'] },
        async ({ page }, testInfo) => {
            await page.addInitScript(
                selectedTheme => localStorage.setItem('theme', selectedTheme),
                theme
            );

            for (const route of routes) {
                await page.goto(`/dashboard/${route}`);
                // Axe must read final colors, not a button still fading in from its disabled opacity.
                await page.addStyleTag({
                    content: '*, *::before, *::after { transition: none !important; }',
                });
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

                expect
                    .soft(severe, `serious or critical violations on /dashboard/${route}`)
                    .toEqual([]);
            }
        }
    );
}

test(
    'keyboard skip link focuses the main content',
    {
        tag: ['@accessibility', '@REQ-NF-006', '@cross-browser-critical', '@mobile-critical'],
    },
    async ({ page, browserName }) => {
        // Safari on macOS reaches buttons with Option+Tab, as its users do.
        const tab = browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab';
        await page.goto('/dashboard/home');
        const main = page.getByRole('main');
        await expect(main).toBeVisible();
        await expect(page.locator('[data-slot="skeleton"]:visible')).toHaveCount(0);
        await page.keyboard.press(tab);
        await expect(page.getByTestId('skip-to-content')).toBeFocused();
        await page.keyboard.press('Enter');
        await expect(main).toBeFocused();
    }
);
