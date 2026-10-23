import { describe, expect, test } from 'vitest';
import { notificationText } from './notification-message';

const translate = (key: string, params: Record<string, string | number>) =>
    `${key} ${JSON.stringify(params)}`;

const achievementName = (code: string) => (code === 'early_bird' ? 'Madrugador' : undefined);

describe('notification text @INH-NOT-05 @REQ-NF-007', () => {
    test('translates the key with its parameters and the deadline as a date', () => {
        expect(
            notificationText(
                {
                    messageKey: 'deadlineToday',
                    messageParams: { title: 'Run', deadline: Date.UTC(2026, 9, 22) },
                    message: 'Objective "Run" is due today.',
                },
                'es',
                translate,
                achievementName
            )
        ).toBe(
            `deadlineToday ${JSON.stringify({ title: 'Run', deadline: Date.UTC(2026, 9, 22), date: '22 oct 2026' })}`
        );
    });

    test('names the achievement in the active language', () => {
        expect(
            notificationText(
                {
                    messageKey: 'achievementEarned',
                    messageParams: { code: 'early_bird', points: 40 },
                    message: 'You unlocked the achievement "early_bird" and earned 40 points.',
                },
                'es',
                translate,
                achievementName
            )
        ).toBe(
            `achievementEarned ${JSON.stringify({ code: 'early_bird', points: 40, name: 'Madrugador' })}`
        );
    });

    test.each([
        ['an unknown key', 'somethingNew', { title: 'Run' }],
        ['an unknown achievement', 'achievementEarned', { code: 'retired', points: 5 }],
        ['a missing parameter', 'progressMilestone', { title: 'Run' }],
        ['a parameter of the wrong type', 'progressMilestone', { title: 'Run', percent: '50' }],
    ])('shows the stored English text for %s', (_case, messageKey, messageParams) => {
        expect(
            notificationText(
                { messageKey, messageParams, message: 'Stored English text.' },
                'es',
                translate,
                achievementName
            )
        ).toBe('Stored English text.');
    });
});
