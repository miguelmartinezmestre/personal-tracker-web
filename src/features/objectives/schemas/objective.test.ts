import { describe, expect, it } from 'vitest';
import { objectiveSchema } from './objective';

describe('objectiveSchema', () => {
    it('accepts a minimal valid objective', () => {
        const result = objectiveSchema.safeParse({
            title: 'Read 12 books',
            description: null,
            category: null,
            targetValue: 12,
            currentValue: 0,
        });

        expect(result.success).toBe(true);
    });

    it('rejects empty title', () => {
        const result = objectiveSchema.safeParse({
            title: '',
            description: null,
            category: null,
            targetValue: 12,
            currentValue: 0,
        });

        expect(result.success).toBe(false);
    });

    it('accepts known status values', () => {
        const result = objectiveSchema.safeParse({
            title: 'Complete project',
            description: null,
            category: null,
            targetValue: 1,
            currentValue: 0,
            status: 'paused',
        });

        expect(result.success).toBe(true);
    });

    it('rejects unknown status values', () => {
        const result = objectiveSchema.safeParse({
            title: 'Complete project',
            description: null,
            category: null,
            targetValue: 1,
            currentValue: 0,
            status: 'in_review',
        });

        expect(result.success).toBe(false);
    });
});
