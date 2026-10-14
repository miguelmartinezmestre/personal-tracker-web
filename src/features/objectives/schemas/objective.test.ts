import { expect, test } from 'vitest';
import { timestampToDateInput, todayDateInput } from '../lib/dates';
import { objectiveFormSchema, progressFormSchema } from './objective';

const DAY_MS = 24 * 60 * 60 * 1000;
// Echoing the key lets the tests check which message each rule shows.
const message = <TKey extends string>(key: TKey) => key;

function progress(updateDate: string, updatedValue = 1) {
    return progressFormSchema(message).safeParse({ updatedValue, updateDate, comment: '' });
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
        objectiveFormSchema(message).safeParse({
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

test('rejects a new deadline in the past but keeps an existing one', () => {
    const yesterday = timestampToDateInput(Date.parse(`${todayDateInput()}T00:00:00Z`) - DAY_MS);
    const objective = (deadline: string, keptDeadline?: string) =>
        objectiveFormSchema(message, keptDeadline).safeParse({
            title: 'Run',
            description: '',
            categoryId: 'none',
            unit: 'km',
            startValue: 0,
            targetValue: 10,
            deadline,
        }).success;
    expect(objective('')).toBe(true);
    expect(objective(todayDateInput())).toBe(true);
    expect(objective(yesterday)).toBe(false);
    expect(objective(yesterday, yesterday)).toBe(true);
});

test('explains each invalid field with its own message', () => {
    const objective = objectiveFormSchema(message).safeParse({
        title: ' ',
        description: '',
        categoryId: 'none',
        unit: '',
        startValue: Number.NaN,
        targetValue: 0,
        deadline: '',
    });
    expect(objective.error?.issues.map(issue => [issue.path.join('.'), issue.message])).toEqual([
        ['title', 'titleRequired'],
        ['startValue', 'numberRequired'],
        ['targetValue', 'targetTooSmall'],
    ]);

    const reversed = objectiveFormSchema(message).safeParse({
        title: 'Run',
        description: '',
        categoryId: 'none',
        unit: '',
        startValue: 8,
        targetValue: 5,
        deadline: '',
    });
    expect(reversed.error?.issues.map(issue => [issue.path.join('.'), issue.message])).toEqual([
        ['startValue', 'startBelowTarget'],
    ]);

    const entry = progressFormSchema(message).safeParse({
        updatedValue: Number.NaN,
        updateDate: '2026-01-01',
        comment: 'x'.repeat(501),
    });
    expect(entry.error?.issues.map(issue => issue.message)).toEqual([
        'amountRequired',
        'commentTooLong',
    ]);
});
