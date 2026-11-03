import { afterEach, expect, test, vi } from 'vitest';
import { isOverdue, objectivePace, todayDateInput } from './dates';

afterEach(() => {
    vi.useRealTimers();
});

test('uses the local calendar day when it differs from the UTC day @REQ-PROGRESO-002', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-06T22:30:00Z'));
    expect(todayDateInput()).toBe('2026-10-07');

    vi.setSystemTime(new Date('2026-10-06T21:30:00Z'));
    expect(todayDateInput()).toBe('2026-10-06');
});

test('flags active objectives only once their deadline day has passed @INH-OBJ-15', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-06T12:00:00Z'));
    const today = Date.UTC(2026, 9, 6);
    const yesterday = Date.UTC(2026, 9, 5);
    expect(isOverdue({ status: 'active', deadline: today })).toBe(false);
    expect(isOverdue({ status: 'active', deadline: yesterday })).toBe(true);
    expect(isOverdue({ status: 'completed', deadline: yesterday })).toBe(false);
    expect(isOverdue({ status: 'active' })).toBe(false);
});

test('compares progress with the ideal pace from creation to the deadline @REQ-OBJETIVOS-010', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-06T12:00:00Z'));

    const objective = {
        status: 'active',
        direction: 'increase' as const,
        createdAt: Date.UTC(2026, 9, 1),
        deadline: Date.UTC(2026, 9, 11),
        startValue: 0,
        targetValue: 100,
    };

    const decreasing = {
        ...objective,
        direction: 'decrease' as const,
        startValue: 100,
        targetValue: 0,
    };

    expect(objectivePace({ ...objective, currentValue: 50 })).toBe('onTrack');
    expect(objectivePace({ ...objective, currentValue: 40 })).toBe('atRisk');
    expect(objectivePace({ ...decreasing, currentValue: 50 })).toBe('onTrack');
    expect(objectivePace({ ...decreasing, currentValue: 60 })).toBe('atRisk');
    expect(objectivePace({ ...objective, deadline: Date.UTC(2026, 9, 5), currentValue: 90 })).toBe(
        'overdue'
    );
    expect(objectivePace({ ...objective, status: 'completed', currentValue: 100 })).toBeUndefined();
    expect(objectivePace({ ...objective, deadline: undefined, currentValue: 0 })).toBeUndefined();
    expect(
        objectivePace({
            ...objective,
            createdAt: Date.parse('2026-10-06T09:00:00Z'),
            currentValue: 0,
        })
    ).toBe('onTrack');
});
