import { expect, test } from 'vitest';
import { getErrorLocale } from './error-messages';

test('error toasts follow the page language, not only the locale cookie @REQ-NF-007 @INH-UI-04', () => {
    document.cookie = 'locale=; max-age=0';
    document.documentElement.lang = 'es';
    expect(getErrorLocale()).toBe('es');
    document.documentElement.lang = 'en';
    expect(getErrorLocale()).toBe('en');
});
