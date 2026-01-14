import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIsMobile } from '@/hooks/use-mobile';

describe('useIsMobile', () => {
    const originalInnerWidth = window.innerWidth;
    const originalMatchMedia = window.matchMedia;

    beforeEach(() => {
        // Reset window.innerWidth
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: originalInnerWidth,
        });

        // Mock matchMedia
        window.matchMedia = vi.fn().mockImplementation(query => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));
    });

    afterEach(() => {
        window.matchMedia = originalMatchMedia;
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: originalInnerWidth,
        });
    });

    it('should return false for desktop width', () => {
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: 1024,
        });

        const { result } = renderHook(() => useIsMobile());
        expect(result.current).toBe(false);
    });

    it('should return true for mobile width', () => {
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: 500,
        });

        const { result } = renderHook(() => useIsMobile());
        expect(result.current).toBe(true);
    });

    it('should return false for tablet width (768px)', () => {
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: 768,
        });

        const { result } = renderHook(() => useIsMobile());
        expect(result.current).toBe(false);
    });

    it('should return true for width below 768px', () => {
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: 767,
        });

        const { result } = renderHook(() => useIsMobile());
        expect(result.current).toBe(true);
    });

    it('should update when window width changes', () => {
        const matchMediaMock = vi.fn().mockImplementation(query => {
            const mql = {
                matches: false,
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn((event, handler) => {
                    if (event === 'change') {
                        mql.onchange = handler;
                    }
                }),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            };
            return mql;
        });

        window.matchMedia = matchMediaMock;

        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: 1024,
        });

        const { result } = renderHook(() => useIsMobile());
        expect(result.current).toBe(false);

        // Simulate window resize
        act(() => {
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: 500,
            });
            // Trigger the change event
            const mql = matchMediaMock.mock.results[0]?.value;
            if (mql?.onchange) {
                mql.onchange();
            }
        });

        expect(result.current).toBe(true);
    });
});
