import { expect, test } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { NextIntlClientProvider } from 'next-intl';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import es from '../../../translations/es.json';
import Home from './home';

const emptyStats = {
    total: 0,
    active: 0,
    completed: 0,
    averageProgress: 0,
    categories: [],
    truncated: false,
};

function renderHome(stats: typeof emptyStats | Record<string, unknown>) {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { staleTime: Number.POSITIVE_INFINITY, retry: false } },
    });
    queryClient.setQueryData(convexQuery(api.auth.getCurrentUser, {}).queryKey, {
        name: 'Ada',
    });
    queryClient.setQueryData(convexQuery(api.dashboard.getDashboardStats, {}).queryKey, stats);
    return render(
        <QueryClientProvider client={queryClient}>
            <NextIntlClientProvider locale="es" messages={es}>
                <Home />
            </NextIntlClientProvider>
        </QueryClientProvider>
    );
}

test('shows the empty state when the organization has no objectives', () => {
    renderHome(emptyStats);
    expect(screen.getByTestId('dashboard-home-empty')).toHaveTextContent(
        es.DashboardHome.emptyState
    );
    expect(screen.queryByTestId('dashboard-stats')).not.toBeInTheDocument();
});

test('renders the average progress gauge and the category chart', () => {
    renderHome({
        total: 3,
        active: 2,
        completed: 1,
        averageProgress: 62,
        categories: [
            {
                categoryId: 'category-1' as Id<'categories'>,
                name: 'Salud',
                color: '#EF4444',
                total: 2,
                completed: 1,
                averageProgress: 75,
            },
            {
                categoryId: null,
                name: null,
                color: null,
                total: 1,
                completed: 0,
                averageProgress: 36,
            },
        ],
        truncated: false,
    });
    expect(screen.getByTestId('dashboard-stats')).toBeInTheDocument();
    expect(
        screen.getByRole('img', { name: 'Progreso medio de los objetivos: 62%' })
    ).toBeInTheDocument();
    expect(
        screen.getByRole('img', { name: es.DashboardHome.charts.byCategoryAria })
    ).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard-home-empty')).not.toBeInTheDocument();
});
