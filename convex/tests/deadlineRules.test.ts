import { describe, expect, test } from 'vitest';
import type { Doc } from '../_generated/dataModel';
import { buildDeadlineMessage, getDeadlineDayWindow } from '../domain/notifications/deadlineRules';

function objective(deadline?: number): Doc<'objectives'> {
    return {
        _id: 'objective-id',
        _creationTime: 0,
        userId: 'user-id',
        organizationId: 'organization-id',
        title: 'Submit thesis',
        targetValue: 100,
        currentValue: 25,
        status: 'active',
        deadline,
        createdAt: 0,
        updatedAt: 0,
    } as Doc<'objectives'>;
}

describe('deadline notification rules', () => {
    const dayMs = 24 * 60 * 60 * 1000;
    const now = Date.UTC(2026, 4, 27, 12, 0, 0);
    const { dayStart, dayEnd, scanUpperBound } = getDeadlineDayWindow(now);

    test('returns the UTC day window for a timestamp', () => {
        expect(dayStart).toBe(Date.UTC(2026, 4, 27, 0, 0, 0));
        expect(dayEnd).toBe(Date.UTC(2026, 4, 28, 0, 0, 0));
    });

    test('scan upper bound extends three days past the end of today', () => {
        expect(scanUpperBound).toBe(dayEnd + dayMs * 3);
        // An objective due in 2 days must fall within the scan window so the
        // cron actually fetches it and can emit an advance reminder.
        expect(objective(now + dayMs * 2).deadline).toBeLessThan(scanUpperBound);
    });

    test('returns null when an objective has no deadline', () => {
        expect(buildDeadlineMessage(objective(), now, dayStart, dayEnd)).toBeNull();
    });

    test('builds overdue messages with singular and plural day wording', () => {
        expect(buildDeadlineMessage(objective(now - 1), now, dayStart, dayEnd)).toContain(
            'overdue by 1 day'
        );
        expect(buildDeadlineMessage(objective(now - dayMs * 2), now, dayStart, dayEnd)).toContain(
            'overdue by 2 days'
        );
    });

    test('builds due today messages inside the current UTC day', () => {
        expect(buildDeadlineMessage(objective(now + 1), now, dayStart, dayEnd)).toContain(
            'due today'
        );
        expect(buildDeadlineMessage(objective(dayEnd - 1), now, dayStart, dayEnd)).toContain(
            'due today'
        );
    });

    test('builds soon messages up to three days out and ignores later deadlines', () => {
        expect(buildDeadlineMessage(objective(now + dayMs), now, dayStart, dayEnd)).toContain(
            'due in 1 day'
        );
        expect(buildDeadlineMessage(objective(now + dayMs * 3), now, dayStart, dayEnd)).toContain(
            'due in 3 days'
        );
        expect(buildDeadlineMessage(objective(now + dayMs * 4), now, dayStart, dayEnd)).toBeNull();
    });
});
