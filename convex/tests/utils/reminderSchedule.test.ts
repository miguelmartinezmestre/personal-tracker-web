import { describe, expect, test } from 'vitest';
import { computeNextReminderAt } from '../../utils/reminderSchedule';

describe('reminderSchedule', () => {
    const DAY_MS = 24 * 60 * 60 * 1000;

    describe('computeNextReminderAt', () => {
        test('does not schedule disabled reminders', () => {
            expect(computeNextReminderAt(undefined, Date.now())).toBeUndefined();
            expect(computeNextReminderAt('none', Date.now())).toBeUndefined();
        });

        test('schedules supported intervals at representative boundaries', () => {
            const cases: Array<[string, string, string]> = [
                ['monthly', '2024-01-15T12:00:00Z', '2024-02-15T12:00:00Z'],
                ['monthly', '2024-12-15T12:00:00Z', '2025-01-15T12:00:00Z'],
                ['biweekly', '2024-01-10T12:00:00Z', '2024-01-15T12:00:00Z'],
                ['biweekly', '2024-01-15T00:00:00Z', '2024-02-01T00:00:00Z'],
                ['biweekly', '2024-12-20T12:00:00Z', '2025-01-01T12:00:00Z'],
            ];

            for (const [interval, now, expected] of cases) {
                expect(computeNextReminderAt(interval, new Date(now).getTime())).toBe(
                    new Date(expected).getTime()
                );
            }
        });

        test('falls back to 14 days for unknown intervals', () => {
            const now = Date.now();
            const result = computeNextReminderAt('unknown', now);

            expect(result).toBe(now + 14 * DAY_MS);
        });

        test('uses current time when now is not provided', () => {
            const before = Date.now();
            const result = computeNextReminderAt('monthly');
            const after = Date.now();

            const expectedMin = computeNextReminderAt('monthly', before)!;
            const expectedMax = computeNextReminderAt('monthly', after)!;

            expect(result).toBeGreaterThanOrEqual(expectedMin);
            expect(result).toBeLessThanOrEqual(expectedMax);
        });
    });
});
