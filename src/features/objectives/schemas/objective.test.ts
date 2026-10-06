import { expect, test } from 'vitest';
import { timestampToDateInput, todayDateInput } from '../lib/dates';
import { objectiveFormSchema, progressFormSchema } from './objective';

const DAY_MS = 24 * 60 * 60 * 1000;

function progress(updateDate: string, updatedValue = 1) {
    return progressFormSchema.safeParse({ updatedValue, updateDate, comment: '' });
}

test('accepts progress dated today or earlier', () => {
    expect(progress(todayDateInput()).success).toBe(true);
    expect(progress('2026-01-01').success).toBe(true);
});

test('rejects progress dated in the future', () => {
    const tomorrow = timestampToDateInput(Date.parse(`${todayDateInput()}T00:00:00Z`) + DAY_MS);
    expect(progress(tomorrow).success).toBe(false);
});

test('requires the starting value to be below the target', () => {
    const objective = (startValue: number, targetValue: number) =>
        objectiveFormSchema.safeParse({
            title: 'Run',
            description: '',
            categoryId: 'none',
            unit: 'km',
            startValue,
            targetValue,
            deadline: '',
        }).success;
    expect(objective(0, 10)).toBe(true);
    expect(objective(5, 5)).toBe(false);
    expect(objective(8, 5)).toBe(false);
});

test('rejects progress that adds nothing', () => {
    expect(progress('2026-01-01', 0).success).toBe(false);
    expect(progress('2026-01-01', 0.001).success).toBe(true);
});
