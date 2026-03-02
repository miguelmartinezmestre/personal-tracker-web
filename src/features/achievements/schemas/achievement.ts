import { z } from 'zod';

export const achievementTypeSchema = z.enum(['individual', 'organization']);
export const achievementCategorySchema = z.enum(['milestone', 'streak', 'completion', 'activity']);
export const achievementTierSchema = z.enum(['bronze', 'silver', 'gold', 'platinum']);

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

export const userAchievementSchema = z.object({
  _id: z.string(),
  user: z.string(),
  achievement: z.string(),
  earnedAt: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
  definition: achievementDefinitionSchema.optional().nullable(),
});

export const organizationAchievementSchema = z.object({
  _id: z.string(),
  organization: z.string(),
  achievement: z.string(),
  earnedAt: z.number(),
  contributingUsers: z.array(z.string()),
  createdAt: z.number(),
  updatedAt: z.number(),
  definition: achievementDefinitionSchema.optional().nullable(),
});

export const achievementProgressSchema = z.object({
  definition: achievementDefinitionSchema,
  currentProgress: z.number(),
  isEarned: z.boolean(),
  earnedAt: z.number().optional(),
});

export const achievementStatsSchema = z.object({
  totalPoints: z.number(),
  earnedCount: z.number(),
  totalAvailable: z.number(),
});

export type AchievementTier = z.infer<typeof achievementTierSchema>;
export type AchievementDefinition = z.infer<typeof achievementDefinitionSchema>;
export type AchievementProgress = z.infer<typeof achievementProgressSchema>;
