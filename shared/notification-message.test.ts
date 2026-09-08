import { expect, test } from 'vitest';
import { createTranslator } from 'next-intl';
import es from '../src/translations/es.json';
import en from '../src/translations/en.json';
import { formatNotificationMessage } from './notification-message';

test('the same stored notification follows the active language', () => {
    const notification = {
        message: 'Legacy fallback',
        messageKey: 'objectiveCompleted',
        messageParams: { title: 'Caminar' },
    };
    const spanish = createTranslator({ locale: 'es', messages: es.Notifications.messages });
    const english = createTranslator({ locale: 'en', messages: en.Notifications.messages });
    expect(formatNotificationMessage(notification, 'es', spanish, code => code)).toContain(
        'completado'
    );
    expect(formatNotificationMessage(notification, 'en', english, code => code)).toContain(
        'completed'
    );
});
test.each([
    { message: 'Historical' },
    { message: 'Historical', messageKey: 'futureCode' },
    { message: 'Historical', messageKey: 'progressAdded', messageParams: { title: 'Incomplete' } },
])('preserves historical or unsupported payloads', notification => {
    expect(
        formatNotificationMessage(
            notification,
            'es',
            () => {
                throw new Error('Must not translate');
            },
            code => code
        )
    ).toBe('Historical');
});
