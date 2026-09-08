import { expect, test } from 'vitest';
import { createTranslator } from 'next-intl';
import en from '../translations/en.json';
import es from '../translations/es.json';

test.each([
    ['en', en],
    ['es', es],
] as const)('renders trash and query-state messages in %s', (locale, messages) => {
    const translate = createTranslator({ locale, messages });
    for (const key of [
        'Objectives.trash.empty',
        'Objectives.trash.loading',
        'Common.queryError',
        'Common.actions.retry',
    ] as const) {
        expect(translate.has(key)).toBe(true);
        expect(translate(key)).not.toContain(key);
    }
});
