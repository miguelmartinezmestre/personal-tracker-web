import { describe, it, expect } from 'vitest';
import { updateProgressSchema } from './update-progress';

describe('updateProgressSchema', () => {
    it('should validate a valid progress update', () => {
        const validUpdate = {
            id: 1,
            objectiveId: 1,
            updatedValue: 75,
            updateDate: new Date(),
            comment: 'Great progress!',
        };

        const result = updateProgressSchema.safeParse(validUpdate);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.updatedValue).toBe(75);
            expect(result.data.comment).toBe('Great progress!');
        }
    });

    it('should allow comment to be optional', () => {
        const validUpdate = {
            updatedValue: 75,
            updateDate: new Date(),
            comment: null, // Schema expects nullable, not undefined
        };

        const result = updateProgressSchema.safeParse(validUpdate);
        expect(result.success).toBe(true);
    });

    it('should require updatedValue', () => {
        const invalidUpdate = {
            updateDate: new Date(),
        };

        const result = updateProgressSchema.safeParse(invalidUpdate);
        expect(result.success).toBe(false);
    });

    it('should require updateDate', () => {
        const invalidUpdate = {
            updatedValue: 75,
        };

        const result = updateProgressSchema.safeParse(invalidUpdate);
        expect(result.success).toBe(false);
    });

    it('should require updatedValue to be a number', () => {
        const invalidUpdate = {
            updatedValue: '75',
            updateDate: new Date(),
        };

        const result = updateProgressSchema.safeParse(invalidUpdate);
        expect(result.success).toBe(false);
    });

    it('should require updateDate to be a date', () => {
        const invalidUpdate = {
            updatedValue: 75,
            updateDate: 'invalid',
        };

        const result = updateProgressSchema.safeParse(invalidUpdate);
        expect(result.success).toBe(false);
    });
});
