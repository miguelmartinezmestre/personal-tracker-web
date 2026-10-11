import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Node 25 defines its own localStorage/sessionStorage globals, so Vitest keeps them instead of
// installing jsdom's. Without --localstorage-file they warn on access and do not store anything.
const jsdomWindow = (globalThis as { jsdom?: { window: Window } }).jsdom?.window;
if (jsdomWindow) {
    for (const key of ['localStorage', 'sessionStorage'] as const) {
        Object.defineProperty(globalThis, key, {
            value: jsdomWindow[key],
            configurable: true,
            writable: true,
        });
    }
}

afterEach(cleanup);
