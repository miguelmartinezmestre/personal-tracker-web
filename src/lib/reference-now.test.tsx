import { act, renderHook } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { useReferenceNow } from './reference-now';

test('refreshes exactly at UTC midnight and on focus without waiting for the polling interval', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-08T23:59:59.900Z'));
    const { result, unmount } = renderHook(() => useReferenceNow());
    try {
        act(() => {
            vi.advanceTimersByTime(100);
        });
        expect(result.current).toBe(Date.parse('2026-09-09T00:00:00Z'));
        vi.setSystemTime(new Date('2026-09-09T08:00:00Z'));
        act(() => {
            window.dispatchEvent(new Event('focus'));
        });
        expect(result.current).toBe(Date.now());
    } finally {
        unmount();
        vi.useRealTimers();
    }
});
