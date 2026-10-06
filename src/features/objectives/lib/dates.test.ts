import { afterEach, expect, test, vi } from 'vitest';
import { todayDateInput } from './dates';

afterEach(() => {
    vi.useRealTimers();
});

test('uses the local calendar day when it differs from the UTC day', () => {
    vi.useFakeTimers();
    // 00:30 on 7 October in Madrid is still 6 October in UTC.
    vi.setSystemTime(new Date('2026-10-06T22:30:00Z'));
    expect(todayDateInput()).toBe('2026-10-07');

    vi.setSystemTime(new Date('2026-10-06T21:30:00Z'));
    expect(todayDateInput()).toBe('2026-10-06');
});
