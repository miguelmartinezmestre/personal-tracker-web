import { expect, test } from 'vitest';
import { progressDifference, valuesAfterEntries } from './progress';

test('stores a new value as its difference from the base value @REQ-PROGRESO-001', () => {
    expect(progressDifference('difference', -1.2, 88)).toBe(-1.2);
    expect(progressDifference('value', 88, 85.1)).toBe(2.9);
});

test('rebuilds the total after each entry from the current value @INH-PRO-05', () => {
    expect(
        valuesAfterEntries(29, [{ updatedValue: 7 }, { updatedValue: -0.1 }, { updatedValue: 12 }])
    ).toEqual([29, 22, 22.1]);
});
