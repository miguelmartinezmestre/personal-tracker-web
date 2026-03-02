import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationBell } from './notification-bell';

const { queryState } = vi.hoisted(() => ({
    queryState: {
        data: { count: 0 },
    },
}));

vi.mock('@tanstack/react-query', () => ({
    useQuery: () => queryState,
}));

vi.mock('@convex-dev/react-query', () => ({
    convexQuery: () => ({ queryKey: ['notifications-count'] }),
}));

vi.mock('next/link', () => ({
    default: ({ href, prefetch: _prefetch, children, ...props }: any) => (
        <a href={typeof href === 'string' ? href : String(href)} {...props}>
            {children}
        </a>
    ),
}));

describe('NotificationBell', () => {
    beforeEach(() => {
        queryState.data = { count: 0 };
    });

    it('renders notifications link without badge when there are no unread items', () => {
        render(<NotificationBell />);

        expect(screen.getByRole('link')).toHaveAttribute('href', '/dashboard/notifications');
        expect(screen.queryByText('0')).not.toBeInTheDocument();
        expect(screen.getByText('No unread notifications')).toBeInTheDocument();
    });

    it('shows unread count badge', () => {
        queryState.data = { count: 7 };
        render(<NotificationBell />);

        expect(screen.getByText('7')).toBeInTheDocument();
        expect(screen.getByText('7 unread notifications')).toBeInTheDocument();
    });

    it('caps badge text to 99+ when count is very high', () => {
        queryState.data = { count: 120 };
        render(<NotificationBell />);

        expect(screen.getByText('99+')).toBeInTheDocument();
        expect(screen.getByText('120 unread notifications')).toBeInTheDocument();
    });
});
