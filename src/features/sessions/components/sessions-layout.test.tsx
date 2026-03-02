import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SessionsLayout from './sessions-layout';

const { sessionsState, sessionsTableMock } = vi.hoisted(() => ({
    sessionsState: {
        currentSession: { id: 'current' },
        sessions: [{ id: 's1' }, { id: 's2' }],
    },
    sessionsTableMock: vi.fn(),
}));

vi.mock('@convex-dev/better-auth/nextjs/client', () => ({
    usePreloadedAuthQuery: () => sessionsState,
}));

vi.mock('./sessions-table', () => ({
    default: (props: any) => {
        sessionsTableMock(props);
        return <div data-testid="sessions-table">Sessions table</div>;
    },
}));

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => {
        const labels: Record<string, string> = {
            title: 'Sessions',
            description: 'Manage your sessions',
        };

        return labels[key] ?? key;
    },
}));

describe('SessionsLayout', () => {
    beforeEach(() => {
        sessionsTableMock.mockReset();
    });

    it('renders heading and forwards sessions data to table', () => {
        render(<SessionsLayout preloadedSessionsQuery={{} as never} />);

        expect(screen.getByRole('heading', { name: 'Sessions' })).toBeInTheDocument();
        expect(screen.getByTestId('sessions-table')).toBeInTheDocument();
        expect(sessionsTableMock).toHaveBeenCalledWith({
            sessions: {
                currentSession: sessionsState.currentSession,
                sessions: sessionsState.sessions,
            },
        });
    });
});
