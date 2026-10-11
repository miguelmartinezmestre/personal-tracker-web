import { afterEach, expect, test, vi } from 'vitest';
import { isOverdue, todayDateInput } from './dates';

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

test('flags active objectives only once their deadline day has passed', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-06T12:00:00Z'));
    const today = Date.UTC(2026, 9, 6);
    const yesterday = Date.UTC(2026, 9, 5);
    expect(isOverdue({ status: 'active', deadline: today })).toBe(false);
    expect(isOverdue({ status: 'active', deadline: yesterday })).toBe(true);
    expect(isOverdue({ status: 'completed', deadline: yesterday })).toBe(false);
    expect(isOverdue({ status: 'active' })).toBe(false);
});
