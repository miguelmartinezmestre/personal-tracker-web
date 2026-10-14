import { expect, test } from 'vitest';
import { formatObjectiveDate, formatObjectiveValue, formatProgressPercent } from './format';

test('hides floating-point noise and follows the locale separator', () => {
    expect(formatObjectiveValue(0.30000000000000004, 'es')).toBe('0,3');
    expect(formatObjectiveValue(7.299999999999997, 'en')).toBe('7.3');
});

test('formats stored calendar days in the UI language without shifting the day', () => {
    expect(formatObjectiveDate(Date.UTC(2027, 2, 31), 'es')).toBe('31 mar 2027');
    expect(formatObjectiveDate(Date.UTC(2027, 2, 31), 'en')).toBe('Mar 31, 2027');
});

test('writes progress percentages like the dashboard does', () => {
    expect(formatProgressPercent(75, 'en')).toBe('75%');
    expect(formatProgressPercent(100, 'es')).toBe(
        new Intl.NumberFormat('es', { style: 'percent' }).format(1)
    );
});
