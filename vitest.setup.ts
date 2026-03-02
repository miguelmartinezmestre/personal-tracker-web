import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

class IntersectionObserverMock {
  root: Element | null = null;
  rootMargin = '';
  thresholds: ReadonlyArray<number> = [];

  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  unobserve() {}
}

globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
globalThis.IntersectionObserver =
  IntersectionObserverMock as unknown as typeof IntersectionObserver;

Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
  writable: true,
  value: vi.fn(),
});
