import { describe, expect, it } from 'vitest';
import { computeObjectiveProgressPercent, normalizeObjective } from './objectives-utils';

describe('normalizeObjective', () => {
    it('normalizes invalid enum-like values to null', () => {
        const normalized = normalizeObjective({
            _id: 'obj_1',
            title: 'Test objective',
            description: null,
            category: null,
            targetValue: 100,
            currentValue: 25,
            startValue: 0,
            deadline: null,
            status: 'active',
            unit: 'pts',
            objectiveType: 'invalid-type',
            direction: 'sideways',
            period: 'weekly',
            periodStart: null,
            periodLengthDays: null,
            reminderInterval: 'daily',
        } as never);

        expect(normalized.objectiveType).toBeNull();
        expect(normalized.direction).toBeNull();
        expect(normalized.period).toBeNull();
        expect(normalized.reminderInterval).toBeNull();
    });

    it('keeps valid enum-like values', () => {
        const normalized = normalizeObjective({
            _id: 'obj_1',
            title: 'Test objective',
            description: null,
            category: null,
            targetValue: 100,
            currentValue: 25,
            startValue: 0,
            deadline: null,
            status: 'active',
            unit: 'pts',
            objectiveType: 'value',
            direction: 'increase',
            period: 'none',
            periodStart: null,
            periodLengthDays: null,
            reminderInterval: 'monthly',
        } as never);

        expect(normalized.objectiveType).toBe('value');
        expect(normalized.direction).toBe('increase');
        expect(normalized.period).toBe('none');
        expect(normalized.reminderInterval).toBe('monthly');
    });
});

describe('computeObjectiveProgressPercent', () => {
    it('computes progress for increasing objective', () => {
        const percent = computeObjectiveProgressPercent({
            currentValue: 50,
            targetValue: 100,
            startValue: 0,
            direction: 'increase',
        });

        expect(percent).toBe(50);
    });

    it('computes progress for decreasing objective', () => {
        const percent = computeObjectiveProgressPercent({
            currentValue: 50,
            targetValue: 0,
            startValue: 100,
            direction: 'decrease',
        });

        expect(percent).toBe(50);
    });

    it('clamps progress between 0 and 100', () => {
        const over = computeObjectiveProgressPercent({
            currentValue: 1000,
            targetValue: 100,
            startValue: 0,
            direction: 'increase',
        });
        const under = computeObjectiveProgressPercent({
            currentValue: -100,
            targetValue: 100,
            startValue: 0,
            direction: 'increase',
        });

        expect(over).toBe(100);
        expect(under).toBe(0);
    });
});
