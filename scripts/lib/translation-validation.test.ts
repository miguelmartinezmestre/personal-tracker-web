// @vitest-environment node
import { expect, test } from 'vitest';
import { findDuplicateTranslationKey } from './translation-validation';

test('rejects duplicate objects which would silently hide translation keys', () => {
    expect(
        findDuplicateTranslationKey(
            '{"Objectives":{"trash":{"empty":"Empty"},"trash":{"title":"Trash"}}}',
            'en.json'
        )
    ).toContain('duplicate translation key "trash"');
});

test('allows the same key in different namespaces', () => {
    expect(
        findDuplicateTranslationKey('{"A":{"title":"A"},"B":{"title":"B"}}', 'en.json')
    ).toBeNull();
});
