import { expect, test } from '../../fixtures/test-base';
import { AchievementsPage } from '../../pages/achievements.page';

test(
    'achievements page exposes individual and organization progress',
    {
        tag: [
            '@REQ-LOGROS-001',
            '@REQ-LOGROS-002',
            '@REQ-LOGROS-003',
            '@REQ-LOGROS-005',
            '@REQ-LOGROS-006',
        ],
    },
    async ({ authenticatedPage }) => {
        const achievements = new AchievementsPage(authenticatedPage);
        await achievements.goto();

        await expect(achievements.achievementsPage).toBeVisible({ timeout: 15000 });
        await expect(achievements.statsSection).toBeVisible();
        await expect(achievements.contentIndividual).toBeVisible();
        await achievements.switchToOrganization();
        await expect(achievements.contentOrganization).toBeVisible();
    }
);
