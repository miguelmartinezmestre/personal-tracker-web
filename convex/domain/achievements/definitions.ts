import type { AchievementType, AchievementCategory, AchievementTier } from '../../utils/constants';

export type AchievementMetricKey =
    | 'objectivesCreated'
    | 'objectivesCompleted'
    | 'progressStreak'
    | 'progressUpdates'
    | 'earlyBirdCompletions'
    | 'organizationObjectivesCreated'
    | 'organizationObjectivesCompleted'
    | 'organizationProgressStreak';

export type AchievementDefinition = {
    code: string;
    type: AchievementType;
    category: AchievementCategory;
    tier: AchievementTier;
    threshold: number;
    metricKey: AchievementMetricKey;
    trigger: 'objective_created' | 'objective_completed' | 'progress_update';
    icon: string;
    points: number;
};

export type AchievementDefinitionView = Omit<AchievementDefinition, 'metricKey' | 'trigger'>;

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
    {
        code: 'first_objective',
        type: 'individual',
        category: 'milestone',
        tier: 'bronze',
        threshold: 1,
        metricKey: 'objectivesCreated',
        trigger: 'objective_created',
        icon: 'Trophy',
        points: 10,
    },
    {
        code: 'objectives_created_5',
        type: 'individual',
        category: 'milestone',
        tier: 'bronze',
        threshold: 5,
        metricKey: 'objectivesCreated',
        trigger: 'objective_created',
        icon: 'Target',
        points: 25,
    },
    {
        code: 'objectives_created_15',
        type: 'individual',
        category: 'milestone',
        tier: 'silver',
        threshold: 15,
        metricKey: 'objectivesCreated',
        trigger: 'objective_created',
        icon: 'Target',
        points: 50,
    },
    {
        code: 'objectives_created_30',
        type: 'individual',
        category: 'milestone',
        tier: 'gold',
        threshold: 30,
        metricKey: 'objectivesCreated',
        trigger: 'objective_created',
        icon: 'Target',
        points: 100,
    },
    {
        code: 'objectives_completed_3',
        type: 'individual',
        category: 'completion',
        tier: 'bronze',
        threshold: 3,
        metricKey: 'objectivesCompleted',
        trigger: 'objective_completed',
        icon: 'CheckCircle',
        points: 30,
    },
    {
        code: 'objectives_completed_10',
        type: 'individual',
        category: 'completion',
        tier: 'silver',
        threshold: 10,
        metricKey: 'objectivesCompleted',
        trigger: 'objective_completed',
        icon: 'CheckCircle',
        points: 75,
    },
    {
        code: 'objectives_completed_25',
        type: 'individual',
        category: 'completion',
        tier: 'gold',
        threshold: 25,
        metricKey: 'objectivesCompleted',
        trigger: 'objective_completed',
        icon: 'CheckCircle',
        points: 150,
    },
    {
        code: 'streak_3',
        type: 'individual',
        category: 'streak',
        tier: 'bronze',
        threshold: 3,
        metricKey: 'progressStreak',
        trigger: 'progress_update',
        icon: 'Flame',
        points: 20,
    },
    {
        code: 'streak_7',
        type: 'individual',
        category: 'streak',
        tier: 'silver',
        threshold: 7,
        metricKey: 'progressStreak',
        trigger: 'progress_update',
        icon: 'Flame',
        points: 50,
    },
    {
        code: 'streak_14',
        type: 'individual',
        category: 'streak',
        tier: 'gold',
        threshold: 14,
        metricKey: 'progressStreak',
        trigger: 'progress_update',
        icon: 'Flame',
        points: 100,
    },
    {
        code: 'progress_updates_10',
        type: 'individual',
        category: 'activity',
        tier: 'bronze',
        threshold: 10,
        metricKey: 'progressUpdates',
        trigger: 'progress_update',
        icon: 'TrendingUp',
        points: 15,
    },
    {
        code: 'progress_updates_50',
        type: 'individual',
        category: 'activity',
        tier: 'silver',
        threshold: 50,
        metricKey: 'progressUpdates',
        trigger: 'progress_update',
        icon: 'TrendingUp',
        points: 40,
    },
    {
        code: 'progress_updates_100',
        type: 'individual',
        category: 'activity',
        tier: 'gold',
        threshold: 100,
        metricKey: 'progressUpdates',
        trigger: 'progress_update',
        icon: 'TrendingUp',
        points: 80,
    },
    {
        code: 'early_bird',
        type: 'individual',
        category: 'completion',
        tier: 'silver',
        threshold: 1,
        metricKey: 'earlyBirdCompletions',
        trigger: 'objective_completed',
        icon: 'Clock',
        points: 40,
    },
    {
        code: 'organization_first_objective',
        type: 'organization',
        category: 'milestone',
        tier: 'bronze',
        threshold: 1,
        metricKey: 'organizationObjectivesCreated',
        trigger: 'objective_created',
        icon: 'Users',
        points: 15,
    },
    {
        code: 'organization_completed_5',
        type: 'organization',
        category: 'completion',
        tier: 'bronze',
        threshold: 5,
        metricKey: 'organizationObjectivesCompleted',
        trigger: 'objective_completed',
        icon: 'Users',
        points: 50,
    },
    {
        code: 'organization_completed_15',
        type: 'organization',
        category: 'completion',
        tier: 'silver',
        threshold: 15,
        metricKey: 'organizationObjectivesCompleted',
        trigger: 'objective_completed',
        icon: 'Users',
        points: 100,
    },
    {
        code: 'organization_completed_30',
        type: 'organization',
        category: 'completion',
        tier: 'gold',
        threshold: 30,
        metricKey: 'organizationObjectivesCompleted',
        trigger: 'objective_completed',
        icon: 'Users',
        points: 200,
    },
    {
        code: 'organization_streak_7',
        type: 'organization',
        category: 'streak',
        tier: 'silver',
        threshold: 7,
        metricKey: 'organizationProgressStreak',
        trigger: 'progress_update',
        icon: 'Flame',
        points: 75,
    },
];

export const ACHIEVEMENT_RULES_BY_CODE = new Map(
    ACHIEVEMENT_DEFINITIONS.map(definition => [
        definition.code,
        {
            metricKey: definition.metricKey,
            trigger: definition.trigger,
        },
    ])
);

export function toAchievementDefinitionView(
    definition: AchievementDefinition
): AchievementDefinitionView {
    const { metricKey: _metricKey, trigger: _trigger, ...view } = definition;
    return view;
}

export function getAchievementDefinition(code: string) {
    return ACHIEVEMENT_DEFINITIONS.find(definition => definition.code === code);
}

export function getAchievementRule(code: string) {
    return ACHIEVEMENT_RULES_BY_CODE.get(code);
}
