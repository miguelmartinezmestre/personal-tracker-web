import { render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useSessionsTableColumns } from './sessions-table-columns';

const { invalidateSessionAsyncMock } = vi.hoisted(() => ({
    invalidateSessionAsyncMock: vi.fn(),
}));

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => key,
}));

vi.mock('./sessions-table-actions', () => ({
    useInvalidateSession: () => ({
        invalidateSessionAsync: invalidateSessionAsyncMock,
        isInvalidatingSession: false,
    }),
}));

describe('useSessionsTableColumns', () => {
    it('revokes sessions using the Better Auth session token', async () => {
        invalidateSessionAsyncMock.mockReset();

        const { result } = renderHook(() =>
            useSessionsTableColumns({
                currentSessionToken: undefined,
            })
        );

        const closeSessionColumn = result.current.find(column => column.id === 'close-session');
        const session = {
            _id: 'session-id',
            token: 'session-token',
            expiresAt: Date.now() + 60_000,
            createdAt: Date.now(),
            userAgent: 'Mozilla/5.0',
        };

        const cell = closeSessionColumn?.cell as
            | ((props: { row: { original: typeof session } }) => ReactNode)
            | undefined;
        if (!cell) {
            throw new Error('Expected close-session column to have a cell renderer');
        }

        render(cell({ row: { original: session } }));

        await userEvent.click(screen.getByRole('button', { name: 'revoke' }));

        expect(invalidateSessionAsyncMock).toHaveBeenCalledWith({ token: 'session-token' });
    });
});
