import { expect, test } from 'vitest';
import { todayDateInput } from '../lib/dates';
import { progressFormSchema } from './objective';

// Echoing the key lets the tests check which message each rule shows.
const message = <TKey extends string>(key: TKey) => key;

function progress(updateDate: string, updatedValue = 1) {
    return progressFormSchema(message).safeParse({ updatedValue, updateDate, comment: '' });
}

test('accepts progress dated today or earlier', () => {
    expect(progress(todayDateInput()).success).toBe(true);
    expect(progress('2026-01-01').success).toBe(true);
});

test('rejects progress that adds nothing', () => {
    expect(progress('2026-01-01', 0).success).toBe(false);
    expect(progress('2026-01-01', 0.001).success).toBe(true);
});
