import { describe, expect, it } from 'vitest';
import { updateProgressSchema } from './update-progress';

describe('updateProgressSchema', () => {
    it('accepts valid update progress payload', () => {
        const result = updateProgressSchema.safeParse({
            objectiveId: 1,
            updatedValue: 42,
            updateDate: new Date('2026-01-01T10:00:00.000Z'),
            comment: 'Steady progress',
        });

        expect(result.success).toBe(true);
    });

    it('accepts null comment', () => {
        const result = updateProgressSchema.safeParse({
            objectiveId: 1,
            updatedValue: 42,
            updateDate: new Date('2026-01-01T10:00:00.000Z'),
            comment: null,
        });

        expect(result.success).toBe(true);
    });

    it('rejects non-number updated value', () => {
        const result = updateProgressSchema.safeParse({
            objectiveId: 1,
            updatedValue: '42',
            updateDate: new Date('2026-01-01T10:00:00.000Z'),
            comment: null,
        });

        expect(result.success).toBe(false);
    });
});
