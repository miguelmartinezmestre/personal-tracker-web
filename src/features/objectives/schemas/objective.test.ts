import { expect, test } from 'vitest';
import { todayDateInput } from '../lib/dates';
import { objectiveFormSchema, progressFormSchema } from './objective';

// Echoing the key lets the tests check which message each rule shows.
const message = <TKey extends string>(key: TKey) => key;

function progressErrors(entry: {
    mode: 'difference' | 'value';
    amount: number;
    updateDate?: string;
}) {
    const result = progressFormSchema(message, 85).safeParse({
        updateDate: todayDateInput(),
        comment: '',
        ...entry,
    });

    return result.error?.issues.map(issue => issue.message) ?? [];
}

test('accepts negative differences and rejects entries that change nothing @INH-PRO-02', () => {
    expect(progressErrors({ mode: 'difference', amount: -1.2 })).toEqual([]);
    expect(progressErrors({ mode: 'difference', amount: 0 })).toEqual(['amountZero']);
    expect(progressErrors({ mode: 'value', amount: 88 })).toEqual([]);
    expect(progressErrors({ mode: 'value', amount: 85 })).toEqual(['valueUnchanged']);
});

test('accepts progress dated today or any earlier day @REQ-PROGRESO-002', () => {
    expect(progressErrors({ mode: 'difference', amount: 1, updateDate: '2026-01-01' })).toEqual([]);
    expect(progressErrors({ mode: 'difference', amount: 1, updateDate: '2000-01-01' })).toEqual([]);
    expect(progressErrors({ mode: 'difference', amount: 1, updateDate: '2999-01-01' })).toEqual([
        'dateFuture',
    ]);
});

test('requires the target ahead of the start in the chosen direction @INH-OBJ-03', () => {
    const errors = (direction: 'increase' | 'decrease', startValue: number, targetValue: number) =>
        objectiveFormSchema(message)
            .safeParse({
                title: 'Weight',
                description: '',
                categoryId: 'none',
                unit: 'kg',
                direction,
                startValue,
                targetValue,
                deadline: '',
                dueSoonDays: 7,
                memberAccess: 'view',
                users: [],
            })
            .error?.issues.map(issue => issue.message) ?? [];

    expect(errors('decrease', 90, 80)).toEqual([]);
    expect(errors('increase', -5, -1)).toEqual([]);
    expect(errors('increase', 90, 80)).toEqual(['targetDirection']);
    expect(errors('decrease', 80, 80)).toEqual(['targetDirection']);
});
