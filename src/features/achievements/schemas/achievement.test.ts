import { describe, expect, it } from 'vitest';
import {
    achievementDefinitionSchema,
    achievementProgressSchema,
    userAchievementSchema,
} from './achievement';

const baseDefinition = {
    _id: 'ach_1',
    code: 'first_objective',
    type: 'individual',
    category: 'milestone',
    tier: 'bronze',
    threshold: 1,
    icon: 'trophy',
    points: 10,
    isActive: true,
    createdAt: 1,
    updatedAt: 1,
} as const;

describe('achievement schemas', () => {
    it('accepts a valid achievement definition', () => {
        const result = achievementDefinitionSchema.safeParse(baseDefinition);
        expect(result.success).toBe(true);
    });

    it('rejects invalid achievement tier', () => {
        const result = achievementDefinitionSchema.safeParse({
            ...baseDefinition,
            tier: 'diamond',
        });

        expect(result.success).toBe(false);
    });

    it('accepts valid user achievement payload', () => {
        const result = userAchievementSchema.safeParse({
            _id: 'ua_1',
            user: 'user_1',
            achievement: 'ach_1',
            earnedAt: 1,
            createdAt: 1,
            updatedAt: 1,
            definition: baseDefinition,
        });

        expect(result.success).toBe(true);
    });

    it('accepts valid achievement progress payload', () => {
        const result = achievementProgressSchema.safeParse({
            definition: baseDefinition,
            currentProgress: 1,
            isEarned: true,
            earnedAt: 1,
        });

        expect(result.success).toBe(true);
    });
});
