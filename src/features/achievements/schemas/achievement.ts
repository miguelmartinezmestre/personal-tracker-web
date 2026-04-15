import { z } from 'zod';
import {
    ACHIEVEMENT_TYPE,
    ACHIEVEMENT_CATEGORY,
    ACHIEVEMENT_TIER,
} from '@/convex/utils/constants';

export const achievementTypeSchema = z.enum([
    ACHIEVEMENT_TYPE.INDIVIDUAL,
    ACHIEVEMENT_TYPE.ORGANIZATION,
]);
export const achievementCategorySchema = z.enum([
    ACHIEVEMENT_CATEGORY.MILESTONE,
    ACHIEVEMENT_CATEGORY.STREAK,
    ACHIEVEMENT_CATEGORY.COMPLETION,
    ACHIEVEMENT_CATEGORY.ACTIVITY,
]);
export const achievementTierSchema = z.enum([
    ACHIEVEMENT_TIER.BRONZE,
    ACHIEVEMENT_TIER.SILVER,
    ACHIEVEMENT_TIER.GOLD,
    ACHIEVEMENT_TIER.PLATINUM,
]);

export const achievementDefinitionSchema = z.object({
    _id: z.string(),
    code: z.string(),
    type: achievementTypeSchema,
    category: achievementCategorySchema,
    tier: achievementTierSchema,
    threshold: z.number(),
    icon: z.string(),
    points: z.number(),
    isActive: z.boolean(),
    createdAt: z.number(),
    updatedAt: z.number(),
});

export const achievementProgressSchema = z.object({
    definition: achievementDefinitionSchema,
    currentProgress: z.number(),
    isEarned: z.boolean(),
    earnedAt: z.number().optional(),
});

export type AchievementTier = z.infer<typeof achievementTierSchema>;
export type AchievementDefinition = z.infer<typeof achievementDefinitionSchema>;
export type AchievementProgress = z.infer<typeof achievementProgressSchema>;
