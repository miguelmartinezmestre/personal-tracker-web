/// <reference types="vite/client" />
import { describe, expect, test } from 'vitest';
import { computeNextReminderAt } from '../../utils/reminderSchedule';

describe('reminderSchedule', () => {
    const DAY_MS = 24 * 60 * 60 * 1000;

    describe('computeNextReminderAt', () => {
        test('returns undefined for undefined interval', () => {
            const result = computeNextReminderAt(undefined, Date.now());
            expect(result).toBeUndefined();
        });

        test('returns undefined for "none" interval', () => {
            const result = computeNextReminderAt('none', Date.now());
            expect(result).toBeUndefined();
        });

        test('returns next month for "monthly" interval', () => {
            const now = new Date('2024-01-15T12:00:00Z').getTime();
            const result = computeNextReminderAt('monthly', now);

            const expected = new Date('2024-02-15T12:00:00Z').getTime();
            expect(result).toBe(expected);
        });

        test('returns 15th of current month for "biweekly" when day < 15', () => {
            const now = new Date('2024-01-10T12:00:00Z').getTime();
            const result = computeNextReminderAt('biweekly', now);

            const expected = new Date('2024-01-15T12:00:00Z').getTime();
            expect(result).toBe(expected);
        });

        test('returns 1st of next month for "biweekly" when day >= 15', () => {
            const now = new Date('2024-01-20T12:00:00Z').getTime();
            const result = computeNextReminderAt('biweekly', now);

            const expected = new Date('2024-02-01T12:00:00Z').getTime();
            expect(result).toBe(expected);
        });

        test('returns 15th when day is exactly 15', () => {
            const now = new Date('2024-01-15T00:00:00Z').getTime();
            const result = computeNextReminderAt('biweekly', now);

            const expected = new Date('2024-02-01T00:00:00Z').getTime();
            expect(result).toBe(expected);
        });

        test('returns 14 days later for unknown interval', () => {
            const now = Date.now();
            const result = computeNextReminderAt('unknown', now);

            expect(result).toBe(now + 14 * DAY_MS);
        });

        test('uses current time when now is not provided', () => {
            const before = Date.now();
            const result = computeNextReminderAt('monthly');
            const after = Date.now();

            const expectedMin = new Date(before);
            expectedMin.setMonth(expectedMin.getMonth() + 1);
            const expectedMax = new Date(after);
            expectedMax.setMonth(expectedMax.getMonth() + 1);

            expect(result).toBeGreaterThanOrEqual(expectedMin.getTime());
            expect(result).toBeLessThanOrEqual(expectedMax.getTime());
        });

        test('handles year boundary for monthly', () => {
            const now = new Date('2024-12-15T12:00:00Z').getTime();
            const result = computeNextReminderAt('monthly', now);

            const expected = new Date('2025-01-15T12:00:00Z').getTime();
            expect(result).toBe(expected);
        });

        test('handles year boundary for biweekly in December', () => {
            const now = new Date('2024-12-20T12:00:00Z').getTime();
            const result = computeNextReminderAt('biweekly', now);

            const expected = new Date('2025-01-01T12:00:00Z').getTime();
            expect(result).toBe(expected);
        });
    });
});
