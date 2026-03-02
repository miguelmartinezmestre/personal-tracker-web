import type { AchievementType, AchievementCategory, AchievementTier } from './constants';

type AchievementDefinition = {
  code: string;
  type: AchievementType;
  category: AchievementCategory;
  tier: AchievementTier;
  threshold: number;
  icon: string;
  points: number;
};

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    code: 'first_objective',
    type: 'individual',
    category: 'milestone',
    tier: 'bronze',
    threshold: 1,
    icon: 'Trophy',
    points: 10,
  },
  {
    code: 'objectives_created_5',
    type: 'individual',
    category: 'milestone',
    tier: 'bronze',
    threshold: 5,
    icon: 'Target',
    points: 25,
  },
  {
    code: 'objectives_created_15',
    type: 'individual',
    category: 'milestone',
    tier: 'silver',
    threshold: 15,
    icon: 'Target',
    points: 50,
  },
  {
    code: 'objectives_created_30',
    type: 'individual',
    category: 'milestone',
    tier: 'gold',
    threshold: 30,
    icon: 'Target',
    points: 100,
  },
  // Individual - Completion
  {
    code: 'objectives_completed_3',
    type: 'individual',
    category: 'completion',
    tier: 'bronze',
    threshold: 3,
    icon: 'CheckCircle',
    points: 30,
  },
  {
    code: 'objectives_completed_10',
    type: 'individual',
    category: 'completion',
    tier: 'silver',
    threshold: 10,
    icon: 'CheckCircle',
    points: 75,
  },
  {
    code: 'objectives_completed_25',
    type: 'individual',
    category: 'completion',
    tier: 'gold',
    threshold: 25,
    icon: 'CheckCircle',
    points: 150,
  },
  // Individual - Streak
  {
    code: 'streak_3',
    type: 'individual',
    category: 'streak',
    tier: 'bronze',
    threshold: 3,
    icon: 'Flame',
    points: 20,
  },
  {
    code: 'streak_7',
    type: 'individual',
    category: 'streak',
    tier: 'silver',
    threshold: 7,
    icon: 'Flame',
    points: 50,
  },
  {
    code: 'streak_14',
    type: 'individual',
    category: 'streak',
    tier: 'gold',
    threshold: 14,
    icon: 'Flame',
    points: 100,
  },
  // Individual - Activity
  {
    code: 'progress_updates_10',
    type: 'individual',
    category: 'activity',
    tier: 'bronze',
    threshold: 10,
    icon: 'TrendingUp',
    points: 15,
  },
  {
    code: 'progress_updates_50',
    type: 'individual',
    category: 'activity',
    tier: 'silver',
    threshold: 50,
    icon: 'TrendingUp',
    points: 40,
  },
  {
    code: 'progress_updates_100',
    type: 'individual',
    category: 'activity',
    tier: 'gold',
    threshold: 100,
    icon: 'TrendingUp',
    points: 80,
  },
  // Individual - Special
  {
    code: 'early_bird',
    type: 'individual',
    category: 'completion',
    tier: 'silver',
    threshold: 1,
    icon: 'Clock',
    points: 40,
  },
  // Organization achievements
  {
    code: 'organization_first_objective',
    type: 'organization',
    category: 'milestone',
    tier: 'bronze',
    threshold: 1,
    icon: 'Users',
    points: 15,
  },
  {
    code: 'organization_completed_5',
    type: 'organization',
    category: 'completion',
    tier: 'bronze',
    threshold: 5,
    icon: 'Users',
    points: 50,
  },
  {
    code: 'organization_completed_15',
    type: 'organization',
    category: 'completion',
    tier: 'silver',
    threshold: 15,
    icon: 'Users',
    points: 100,
  },
  {
    code: 'organization_completed_30',
    type: 'organization',
    category: 'completion',
    tier: 'gold',
    threshold: 30,
    icon: 'Users',
    points: 200,
  },
  {
    code: 'organization_streak_7',
    type: 'organization',
    category: 'streak',
    tier: 'silver',
    threshold: 7,
    icon: 'Flame',
    points: 75,
  },
];
