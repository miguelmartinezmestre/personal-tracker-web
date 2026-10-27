import { expect, test } from 'vitest';
import { formatObjectiveDate, formatObjectiveValue } from './format';

test('hides floating-point noise and follows the locale separator @REQ-NF-007', () => {
    expect(formatObjectiveValue(0.30000000000000004, 'es')).toBe('0,3');
    expect(formatObjectiveValue(7.299999999999997, 'en')).toBe('7.3');
});

test('formats stored calendar days in the UI language without shifting the day @REQ-NF-007 @INH-OBJ-10', () => {
    expect(formatObjectiveDate(Date.UTC(2027, 2, 31), 'es')).toBe('31 mar 2027');
    expect(formatObjectiveDate(Date.UTC(2027, 2, 31), 'en')).toBe('Mar 31, 2027');
});
