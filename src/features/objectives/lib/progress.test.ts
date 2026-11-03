import { expect, test } from 'vitest';
import { progressDifference } from './progress';

test('stores a new value as its difference from the base value @REQ-PROGRESO-001', () => {
    expect(progressDifference('difference', -1.2, 88)).toBe(-1.2);
    expect(progressDifference('value', 88, 85.1)).toBe(2.9);
});
