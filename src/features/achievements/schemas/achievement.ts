import { z } from 'zod';
import { ACHIEVEMENT_TYPE, ACHIEVEMENT_CATEGORY, ACHIEVEMENT_TIER } from '@/convex/utils/constants';

const achievementTypeSchema = z.enum([ACHIEVEMENT_TYPE.INDIVIDUAL, ACHIEVEMENT_TYPE.ORGANIZATION]);
const achievementCategorySchema = z.enum([
    ACHIEVEMENT_CATEGORY.MILESTONE,
    ACHIEVEMENT_CATEGORY.STREAK,
    ACHIEVEMENT_CATEGORY.COMPLETION,
    ACHIEVEMENT_CATEGORY.ACTIVITY,
]);
const achievementTierSchema = z.enum([
    ACHIEVEMENT_TIER.BRONZE,
    ACHIEVEMENT_TIER.SILVER,
    ACHIEVEMENT_TIER.GOLD,
]);

const achievementDefinitionSchema = z.object({
    code: z.string(),
    type: achievementTypeSchema,
    category: achievementCategorySchema,
    tier: achievementTierSchema,
    threshold: z.number(),
    icon: z.string(),
    points: z.number(),
});

const achievementProgressSchema = z.object({
    definition: achievementDefinitionSchema,
    currentProgress: z.number(),
    isEarned: z.boolean(),
    earnedAt: z.number().optional(),
});

export type AchievementTier = z.infer<typeof achievementTierSchema>;
export type AchievementDefinition = z.infer<typeof achievementDefinitionSchema>;
export type AchievementProgress = z.infer<typeof achievementProgressSchema>;
