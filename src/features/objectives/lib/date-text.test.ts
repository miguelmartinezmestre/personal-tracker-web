import { expect, test } from 'vitest';
import { formatDateText, parseDateText } from './date-text';

const now = new Date(2026, 9, 22, 10);

test.each([
    ['es', 'mañana', '2026-10-23'],
    ['es', 'hace 3 días', '2026-10-19'],
    ['es', '25 de diciembre', '2026-12-25'],
    ['en', 'tomorrow', '2026-10-23'],
] as const)('reads "%s" text "%s" as %s @REQ-OBJETIVOS-005', (locale, text, expected) => {
    expect(parseDateText(text, locale, { now })).toBe(expected);
});

test('rejects text that is not entirely a date @REQ-OBJETIVOS-005', () => {
    expect(parseDateText('mañana o pasado', 'es', { now })).toBeUndefined();
    expect(parseDateText('soon', 'en', { now })).toBeUndefined();
});

test('writes a picked day as text that reads back as the same day @REQ-OBJETIVOS-005', () => {
    for (const locale of ['es', 'en']) {
        expect(parseDateText(formatDateText('2026-03-04', locale), locale, { now })).toBe(
            '2026-03-04'
        );
    }
});
