import { describe, expect, test } from 'vitest';
import type { Doc } from '../_generated/dataModel';
import { buildDeadlineMessage, getDeadlineDayWindow } from '../domain/notifications/deadlineRules';
import { asTestId } from './testCasts';

function objective(deadline?: number): Doc<'objectives'> {
    return {
        _id: asTestId<'objectives'>('objective-id'),
        _creationTime: 0,
        createdBy: asTestId<'user'>('user-id'),
        ownerId: asTestId<'user'>('user-id'),
        visibility: 'private',
        organizationId: asTestId<'organization'>('organization-id'),
        title: 'Submit thesis',
        targetValue: 100,
        currentValue: 25,
        status: 'active',
        deadline,
        createdAt: 0,
        updatedAt: 0,
    };
}

describe('deadline notification rules', () => {
    const dayMs = 24 * 60 * 60 * 1000;
    const now = Date.UTC(2026, 4, 27, 12, 0, 0);
    const { dayStart, dayEnd, scanUpperBound } = getDeadlineDayWindow(now);

    test('returns the UTC scan window for deadline notifications', () => {
        expect(dayStart).toBe(Date.UTC(2026, 4, 27, 0, 0, 0));
        expect(dayEnd).toBe(Date.UTC(2026, 4, 28, 0, 0, 0));
        expect(scanUpperBound).toBe(dayEnd + dayMs * 3);
        expect(objective(now + dayMs * 2).deadline).toBeLessThan(scanUpperBound);
    });

    test('returns null for objectives that should not produce deadline messages', () => {
        expect(buildDeadlineMessage(objective(), now, dayStart, dayEnd)).toBeNull();
        expect(buildDeadlineMessage(objective(now + dayMs * 4), now, dayStart, dayEnd)).toBeNull();
    });

    test('builds overdue, due today, and due soon messages', () => {
        const cases: Array<[number, string]> = [
            [dayStart - dayMs, 'overdue by 1 day'],
            [dayStart - dayMs * 2, 'overdue by 2 days'],
            [dayStart, 'due today'],
            [dayEnd - 1, 'due today'],
            [dayEnd, 'due in 1 day'],
            [dayEnd + dayMs * 2, 'due in 3 days'],
        ];

        for (const [deadline, message] of cases) {
            expect(buildDeadlineMessage(objective(deadline), now, dayStart, dayEnd)).toContain(
                message
            );
        }
    });
});
