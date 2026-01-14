import { describe, it, expect } from 'vitest';
import {
    achievementTypeSchema,
    achievementCategorySchema,
    achievementTierSchema,
    achievementDefinitionSchema,
    userAchievementSchema,
    teamAchievementSchema,
    achievementProgressSchema,
    achievementStatsSchema,
} from '@/schemas/achievement';

describe('achievementTypeSchema', () => {
    it('accepts valid achievement types', () => {
        expect(achievementTypeSchema.safeParse('individual').success).toBe(true);
        expect(achievementTypeSchema.safeParse('team').success).toBe(true);
    });

    it('rejects invalid achievement types', () => {
        expect(achievementTypeSchema.safeParse('personal').success).toBe(false);
        expect(achievementTypeSchema.safeParse('group').success).toBe(false);
        expect(achievementTypeSchema.safeParse('').success).toBe(false);
    });
});

describe('achievementCategorySchema', () => {
    it('accepts valid categories', () => {
        const validCategories = ['milestone', 'streak', 'completion', 'activity'];

        validCategories.forEach(category => {
            expect(achievementCategorySchema.safeParse(category).success).toBe(true);
        });
    });

    it('rejects invalid categories', () => {
        expect(achievementCategorySchema.safeParse('progress').success).toBe(false);
        expect(achievementCategorySchema.safeParse('special').success).toBe(false);
    });
});

describe('achievementTierSchema', () => {
    it('accepts valid tiers', () => {
        const validTiers = ['bronze', 'silver', 'gold', 'platinum'];

        validTiers.forEach(tier => {
            expect(achievementTierSchema.safeParse(tier).success).toBe(true);
        });
    });

    it('rejects invalid tiers', () => {
        expect(achievementTierSchema.safeParse('diamond').success).toBe(false);
        expect(achievementTierSchema.safeParse('copper').success).toBe(false);
    });
});

describe('achievementDefinitionSchema', () => {
    const validDefinition = {
        _id: 'def-123',
        code: 'first_objective',
        type: 'individual',
        category: 'milestone',
        tier: 'bronze',
        threshold: 1,
        icon: 'Trophy',
        points: 10,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };

    it('validates a complete definition', () => {
        const result = achievementDefinitionSchema.safeParse(validDefinition);
        expect(result.success).toBe(true);
    });

    it('rejects missing required fields', () => {
        const requiredFields = [
            '_id',
            'code',
            'type',
            'category',
            'tier',
            'threshold',
            'icon',
            'points',
            'isActive',
            'createdAt',
            'updatedAt',
        ];

        requiredFields.forEach(field => {
            const definition = { ...validDefinition };
            delete (definition as any)[field];

            const result = achievementDefinitionSchema.safeParse(definition);
            expect(result.success).toBe(false);
        });
    });

    it('validates threshold as number', () => {
        const result = achievementDefinitionSchema.safeParse({
            ...validDefinition,
            threshold: 'five',
        });
        expect(result.success).toBe(false);
    });

    it('validates points as number', () => {
        const result = achievementDefinitionSchema.safeParse({
            ...validDefinition,
            points: 'ten',
        });
        expect(result.success).toBe(false);
    });

    it('validates isActive as boolean', () => {
        const result = achievementDefinitionSchema.safeParse({
            ...validDefinition,
            isActive: 'yes',
        });
        expect(result.success).toBe(false);
    });

    it('accepts inactive definitions', () => {
        const result = achievementDefinitionSchema.safeParse({
            ...validDefinition,
            isActive: false,
        });
        expect(result.success).toBe(true);
    });
});

describe('userAchievementSchema', () => {
    const validUserAchievement = {
        _id: 'ua-123',
        user: 'user-456',
        achievement: 'def-789',
        earnedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };

    it('validates a user achievement', () => {
        const result = userAchievementSchema.safeParse(validUserAchievement);
        expect(result.success).toBe(true);
    });

    it('accepts optional definition field', () => {
        const withDefinition = {
            ...validUserAchievement,
            definition: {
                _id: 'def-123',
                code: 'first_objective',
                type: 'individual',
                category: 'milestone',
                tier: 'bronze',
                threshold: 1,
                icon: 'Trophy',
                points: 10,
                isActive: true,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            },
        };

        const result = userAchievementSchema.safeParse(withDefinition);
        expect(result.success).toBe(true);
    });

    it('accepts null definition', () => {
        const withNullDef = { ...validUserAchievement, definition: null };

        const result = userAchievementSchema.safeParse(withNullDef);
        expect(result.success).toBe(true);
    });

    it('rejects missing user field', () => {
        const invalid = { ...validUserAchievement };
        delete (invalid as any).user;

        const result = userAchievementSchema.safeParse(invalid);
        expect(result.success).toBe(false);
    });

    it('rejects missing earnedAt field', () => {
        const invalid = { ...validUserAchievement };
        delete (invalid as any).earnedAt;

        const result = userAchievementSchema.safeParse(invalid);
        expect(result.success).toBe(false);
    });
});

describe('teamAchievementSchema', () => {
    const validTeamAchievement = {
        _id: 'ta-123',
        team: 'team-456',
        achievement: 'def-789',
        earnedAt: Date.now(),
        contributingUsers: ['user-1', 'user-2'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };

    it('validates a team achievement', () => {
        const result = teamAchievementSchema.safeParse(validTeamAchievement);
        expect(result.success).toBe(true);
    });

    it('accepts empty contributingUsers array', () => {
        const withEmpty = { ...validTeamAchievement, contributingUsers: [] };

        const result = teamAchievementSchema.safeParse(withEmpty);
        expect(result.success).toBe(true);
    });

    it('rejects missing team field', () => {
        const invalid = { ...validTeamAchievement };
        delete (invalid as any).team;

        const result = teamAchievementSchema.safeParse(invalid);
        expect(result.success).toBe(false);
    });

    it('rejects missing contributingUsers field', () => {
        const invalid = { ...validTeamAchievement };
        delete (invalid as any).contributingUsers;

        const result = teamAchievementSchema.safeParse(invalid);
        expect(result.success).toBe(false);
    });

    it('validates contributingUsers as array of strings', () => {
        const invalid = { ...validTeamAchievement, contributingUsers: [1, 2, 3] };

        const result = teamAchievementSchema.safeParse(invalid);
        expect(result.success).toBe(false);
    });
});

describe('achievementProgressSchema', () => {
    const validProgress = {
        definition: {
            _id: 'def-123',
            code: 'first_objective',
            type: 'individual',
            category: 'milestone',
            tier: 'bronze',
            threshold: 10,
            icon: 'Trophy',
            points: 50,
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        },
        currentProgress: 5,
        isEarned: false,
    };

    it('validates progress object', () => {
        const result = achievementProgressSchema.safeParse(validProgress);
        expect(result.success).toBe(true);
    });

    it('accepts optional earnedAt when earned', () => {
        const earned = {
            ...validProgress,
            isEarned: true,
            earnedAt: Date.now(),
        };

        const result = achievementProgressSchema.safeParse(earned);
        expect(result.success).toBe(true);
    });

    it('validates currentProgress as number', () => {
        const invalid = { ...validProgress, currentProgress: 'five' };

        const result = achievementProgressSchema.safeParse(invalid);
        expect(result.success).toBe(false);
    });

    it('validates isEarned as boolean', () => {
        const invalid = { ...validProgress, isEarned: 'yes' };

        const result = achievementProgressSchema.safeParse(invalid);
        expect(result.success).toBe(false);
    });

    it('accepts zero progress', () => {
        const zeroProgress = { ...validProgress, currentProgress: 0 };

        const result = achievementProgressSchema.safeParse(zeroProgress);
        expect(result.success).toBe(true);
    });

    it('accepts progress exceeding threshold', () => {
        const overProgress = { ...validProgress, currentProgress: 15 };

        const result = achievementProgressSchema.safeParse(overProgress);
        expect(result.success).toBe(true);
    });
});

describe('achievementStatsSchema', () => {
    const validStats = {
        totalPoints: 150,
        earnedCount: 5,
        totalAvailable: 15,
    };

    it('validates stats object', () => {
        const result = achievementStatsSchema.safeParse(validStats);
        expect(result.success).toBe(true);
    });

    it('accepts zero values', () => {
        const zeroStats = {
            totalPoints: 0,
            earnedCount: 0,
            totalAvailable: 0,
        };

        const result = achievementStatsSchema.safeParse(zeroStats);
        expect(result.success).toBe(true);
    });

    it('rejects non-number totalPoints', () => {
        const invalid = { ...validStats, totalPoints: 'many' };

        const result = achievementStatsSchema.safeParse(invalid);
        expect(result.success).toBe(false);
    });

    it('rejects missing fields', () => {
        const fields = ['totalPoints', 'earnedCount', 'totalAvailable'];

        fields.forEach(field => {
            const stats = { ...validStats };
            delete (stats as any)[field];

            const result = achievementStatsSchema.safeParse(stats);
            expect(result.success).toBe(false);
        });
    });

    it('accepts large numbers', () => {
        const largeStats = {
            totalPoints: 999999,
            earnedCount: 1000,
            totalAvailable: 1000,
        };

        const result = achievementStatsSchema.safeParse(largeStats);
        expect(result.success).toBe(true);
    });
});
