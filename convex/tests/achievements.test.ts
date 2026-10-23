import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { api } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { DAY_MS, startOfUtcDay } from '../features/objectives/rules';
import { initConvexTest } from './test.helper';
import {
    createTestMember,
    createTestOrganization,
    createTestUser,
    type TestUserData,
} from './test.helpers';
import { identityFor } from './test.identities';

const page = { numItems: 20, cursor: null };

describe('achievements', () => {
    const t = initConvexTest();
    let organizationId: Id<'organization'>;
    let creator: TestUserData;
    let member: TestUserData;

    const as = (user: TestUserData) => t.withIdentity(identityFor(user));
    const runScheduled = () => t.finishAllScheduledFunctions(() => vi.runAllTimers());

    async function createOrganization() {
        const suffix = Math.random().toString(36).slice(2, 10);

        return await createTestOrganization(t, {
            name: `Achievers ${suffix}`,
            slug: `achievers-${suffix}`,
        });
    }

    async function joinAs(role: string, name: string, organization = organizationId) {
        const suffix = Math.random().toString(36).slice(2, 10);

        const user = await createTestUser(t, {
            userId: `${name}-${suffix}`,
            email: `${name}-${suffix}@example.com`,
            name,
            role: 'user',
        });

        await createTestMember(t, { organizationId: organization, userId: user.docId, role });

        return user;
    }

    const achievementsOf = async (user: TestUserData) => {
        const result = await as(user).query(api.achievements.getAchievements, {});

        return {
            ...result,
            byCode: new Map(
                result.achievements.map(achievement => [achievement.code, achievement])
            ),
            earned: result.achievements
                .filter(achievement => achievement.earnedAt !== null)
                .map(achievement => achievement.code)
                .sort(),
        };
    };

    const createObjective = (user: TestUserData, title: string) =>
        as(user).mutation(api.objectives.createObjective, {
            title,
            startValue: 0,
            targetValue: 10,
            deadline: startOfUtcDay(Date.now()) + 30 * DAY_MS,
            memberAccess: 'edit',
        });

    beforeEach(async () => {
        vi.useFakeTimers();
        organizationId = await createOrganization();
        creator = await joinAs('owner', 'creator');
        member = await joinAs('member', 'member');
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('creating and completing objectives award each achievement once, with points and notices @REQ-LOGROS-001 @REQ-LOGROS-002 @REQ-LOGROS-003 @REQ-LOGROS-004 @REQ-LOGROS-005 @REQ-LOGROS-006 @REQ-LOGROS-007 @INH-LOG-01 @INH-LOG-02 @INH-LOG-03 @INH-LOG-04 @INH-OBJ-13', async () => {
        const objectiveId = await createObjective(creator, 'Early goal');
        await createObjective(creator, 'Second goal');
        await runScheduled();

        const afterCreating = await achievementsOf(creator);

        expect(
            afterCreating.achievements.filter(achievement => achievement.scope === 'individual')
        ).toHaveLength(14);
        expect(
            afterCreating.achievements.filter(achievement => achievement.scope === 'organization')
        ).toHaveLength(5);
        expect(afterCreating.earned).toEqual(['first_objective', 'organization_first_objective']);
        expect(afterCreating.userPoints).toBe(10);
        expect(afterCreating.organizationPoints).toBe(15);
        expect(afterCreating.byCode.get('objectives_created_5')).toMatchObject({
            tier: 'bronze',
            threshold: 5,
            progress: 2,
            earnedAt: null,
        });

        // Completing counts for the creator, even when someone else logs the progress.
        await as(member).mutation(api.progress.createProgress, {
            objectiveId,
            updatedValue: 10,
            updateDate: startOfUtcDay(Date.now()),
        });
        await runScheduled();

        expect((await achievementsOf(creator)).earned).toEqual([
            'early_bird',
            'first_objective',
            'organization_first_objective',
        ]);
        expect((await achievementsOf(member)).earned).toEqual(['organization_first_objective']);

        const notices = async (user: TestUserData) =>
            (
                await as(user).query(api.notifications.listNotifications, { paginationOpts: page })
            ).page
                .filter(notification => notification.type === 'achievement')
                .map(
                    notification => `${notification.messageKey}:${notification.messageParams.code}`
                )
                .sort();

        expect(await notices(creator)).toEqual([
            'achievementEarned:early_bird',
            'achievementEarned:first_objective',
            'organizationAchievementEarned:organization_first_objective',
        ]);
        expect(await notices(member)).toEqual([
            'organizationAchievementEarned:organization_first_objective',
        ]);
    });

    test('streaks count consecutive UTC days of progress and restart after a missed day @REQ-LOGROS-008 @INH-LOG-06 @INH-PRO-06', async () => {
        const today = startOfUtcDay(Date.now());
        const objectiveId = await createObjective(creator, 'Daily');

        for (const daysAgo of [5, 4, 3]) {
            await as(member).mutation(api.progress.createProgress, {
                objectiveId,
                updatedValue: 1,
                updateDate: today - daysAgo * DAY_MS,
            });
        }

        for (const daysAgo of [2, 1, 0]) {
            await as(creator).mutation(api.progress.createProgress, {
                objectiveId,
                updatedValue: 1,
                updateDate: today - daysAgo * DAY_MS,
            });
        }

        await runScheduled();

        const creatorAchievements = await achievementsOf(creator);
        expect(creatorAchievements.earned).toContain('streak_3');
        expect(creatorAchievements.byCode.get('streak_7')?.progress).toBe(3);
        // The organization was active all six days in a row.
        expect(creatorAchievements.byCode.get('organization_streak_7')?.progress).toBe(6);

        // Their three days ended before yesterday, so the streak is lost.
        const memberAchievements = await achievementsOf(member);
        expect(memberAchievements.earned).not.toContain('streak_3');
        expect(memberAchievements.byCode.get('streak_3')?.progress).toBe(0);
    });

    test('organization achievements stay in their organization @INH-LOG-08', async () => {
        await createObjective(creator, 'Team goal');
        await runScheduled();

        const outsider = await joinAs('owner', 'outsider', await createOrganization());
        const outsiderAchievements = await achievementsOf(outsider);

        expect(outsiderAchievements.earned).toEqual([]);
        expect(outsiderAchievements.organizationPoints).toBe(0);
        expect(outsiderAchievements.byCode.get('organization_first_objective')?.progress).toBe(0);
    });
});
