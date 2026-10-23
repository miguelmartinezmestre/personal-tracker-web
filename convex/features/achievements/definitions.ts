export type AchievementMetric =
    | 'objectivesCreated'
    | 'objectivesCompleted'
    | 'earlyBirdCompletions'
    | 'progressUpdates'
    | 'progressStreak'
    | 'organizationObjectivesCreated'
    | 'organizationObjectivesCompleted'
    | 'organizationProgressStreak';

export type Achievement = {
    code: string;
    scope: 'individual' | 'organization';
    category: 'milestone' | 'completion' | 'streak' | 'activity';
    tier: 'bronze' | 'silver' | 'gold';
    metric: AchievementMetric;
    threshold: number;
    points: number;
};

// 14 individual and 5 organization achievements (INH-LOG-02); names live in the translations.
export const ACHIEVEMENTS: readonly Achievement[] = [
    {
        code: 'first_objective',
        scope: 'individual',
        category: 'milestone',
        tier: 'bronze',
        metric: 'objectivesCreated',
        threshold: 1,
        points: 10,
    },
    {
        code: 'objectives_created_5',
        scope: 'individual',
        category: 'milestone',
        tier: 'bronze',
        metric: 'objectivesCreated',
        threshold: 5,
        points: 25,
    },
    {
        code: 'objectives_created_15',
        scope: 'individual',
        category: 'milestone',
        tier: 'silver',
        metric: 'objectivesCreated',
        threshold: 15,
        points: 50,
    },
    {
        code: 'objectives_created_30',
        scope: 'individual',
        category: 'milestone',
        tier: 'gold',
        metric: 'objectivesCreated',
        threshold: 30,
        points: 100,
    },
    {
        code: 'objectives_completed_3',
        scope: 'individual',
        category: 'completion',
        tier: 'bronze',
        metric: 'objectivesCompleted',
        threshold: 3,
        points: 30,
    },
    {
        code: 'objectives_completed_10',
        scope: 'individual',
        category: 'completion',
        tier: 'silver',
        metric: 'objectivesCompleted',
        threshold: 10,
        points: 75,
    },
    {
        code: 'objectives_completed_25',
        scope: 'individual',
        category: 'completion',
        tier: 'gold',
        metric: 'objectivesCompleted',
        threshold: 25,
        points: 150,
    },
    {
        code: 'early_bird',
        scope: 'individual',
        category: 'completion',
        tier: 'silver',
        metric: 'earlyBirdCompletions',
        threshold: 1,
        points: 40,
    },
    {
        code: 'streak_3',
        scope: 'individual',
        category: 'streak',
        tier: 'bronze',
        metric: 'progressStreak',
        threshold: 3,
        points: 20,
    },
    {
        code: 'streak_7',
        scope: 'individual',
        category: 'streak',
        tier: 'silver',
        metric: 'progressStreak',
        threshold: 7,
        points: 50,
    },
    {
        code: 'streak_14',
        scope: 'individual',
        category: 'streak',
        tier: 'gold',
        metric: 'progressStreak',
        threshold: 14,
        points: 100,
    },
    {
        code: 'progress_updates_10',
        scope: 'individual',
        category: 'activity',
        tier: 'bronze',
        metric: 'progressUpdates',
        threshold: 10,
        points: 15,
    },
    {
        code: 'progress_updates_50',
        scope: 'individual',
        category: 'activity',
        tier: 'silver',
        metric: 'progressUpdates',
        threshold: 50,
        points: 40,
    },
    {
        code: 'progress_updates_100',
        scope: 'individual',
        category: 'activity',
        tier: 'gold',
        metric: 'progressUpdates',
        threshold: 100,
        points: 80,
    },
    {
        code: 'organization_first_objective',
        scope: 'organization',
        category: 'milestone',
        tier: 'bronze',
        metric: 'organizationObjectivesCreated',
        threshold: 1,
        points: 15,
    },
    {
        code: 'organization_completed_5',
        scope: 'organization',
        category: 'completion',
        tier: 'bronze',
        metric: 'organizationObjectivesCompleted',
        threshold: 5,
        points: 50,
    },
    {
        code: 'organization_completed_15',
        scope: 'organization',
        category: 'completion',
        tier: 'silver',
        metric: 'organizationObjectivesCompleted',
        threshold: 15,
        points: 100,
    },
    {
        code: 'organization_completed_30',
        scope: 'organization',
        category: 'completion',
        tier: 'gold',
        metric: 'organizationObjectivesCompleted',
        threshold: 30,
        points: 200,
    },
    {
        code: 'organization_streak_7',
        scope: 'organization',
        category: 'streak',
        tier: 'silver',
        metric: 'organizationProgressStreak',
        threshold: 7,
        points: 75,
    },
];

// Counting past the highest threshold changes nothing, so every metric stops there (INH-LOG-05).
export function metricCap(metric: AchievementMetric): number {
    return Math.max(
        ...ACHIEVEMENTS.filter(achievement => achievement.metric === metric).map(
            achievement => achievement.threshold
        )
    );
}
