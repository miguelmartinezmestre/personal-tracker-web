// @vitest-environment node
import { expect, test } from 'vitest';
import { assertUniqueTranslationKeys } from './translation-validation';

test('rejects duplicate objects which would silently hide translation keys', () => {
    expect(() =>
        assertUniqueTranslationKeys(
            '{"Objectives":{"trash":{"empty":"Empty"},"trash":{"title":"Trash"}}}',
            'en.json'
        )
    ).toThrow('duplicate translation key "trash"');
});
test('allows the same key in different namespaces', () => {
    expect(() =>
        assertUniqueTranslationKeys('{"A":{"title":"A"},"B":{"title":"B"}}', 'en.json')
    ).not.toThrow();
});
