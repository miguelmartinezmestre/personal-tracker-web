import { expect, test } from 'vitest';
import { formatObjectiveValue } from './format';

test('hides floating-point noise and follows the locale separator', () => {
    expect(formatObjectiveValue(0.30000000000000004, 'es')).toBe('0,3');
    expect(formatObjectiveValue(7.299999999999997, 'en')).toBe('7.3');
});

test('keeps the smallest allowed target visible', () => {
    expect(formatObjectiveValue(0.001, 'es')).toBe('0,001');
});
