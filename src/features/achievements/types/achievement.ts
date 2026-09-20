import type { api } from '@/convex/_generated/api';
import type { FunctionReturnType } from 'convex/server';

export type AchievementProgress = FunctionReturnType<
    typeof api.achievements.getUserAchievementProgress
>[number];
export type AchievementDefinition = AchievementProgress['definition'];
export type AchievementTier = AchievementDefinition['tier'];
