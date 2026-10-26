import { expect, test } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { NextIntlClientProvider } from 'next-intl';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import es from '../../../translations/es.json';
import ProgressChart from './progress-chart';

const objectiveId = 'objective-1' as Id<'objectives'>;

const objective = {
    id: objectiveId,
    startValue: 0,
    targetValue: 10,
    createdAt: Date.UTC(2026, 0, 1),
    deadline: Date.UTC(2026, 1, 1),
    unit: 'km',
};

function renderWithHistory(
    points: { updateDate: number; value: number; delta: number; comment?: string }[],
    chartObjective: typeof objective = objective
) {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: Number.POSITIVE_INFINITY,
                retry: false,
                queryFn: ({ queryKey }) =>
                    Promise.reject(new Error(`Unseeded query: ${JSON.stringify(queryKey)}`)),
            },
        },
    });

    queryClient.setQueryData(
        convexQuery(api.progress.getProgressHistory, { objectiveId }).queryKey,
        {
            points: points.map((point, index) => ({
                id: `progress-${index}` as Id<'progressUpdates'>,
                ...point,
            })),
            isTruncated: false,
        }
    );

    return render(
        <QueryClientProvider client={queryClient}>
            <NextIntlClientProvider locale="es" messages={es}>
                <ProgressChart objective={chartObjective} />
            </NextIntlClientProvider>
        </QueryClientProvider>
    );
}

test('shows an empty state until progress is logged', () => {
    renderWithHistory([]);
    expect(screen.getByTestId('progress-chart-empty')).toHaveTextContent(es.Objectives.chart.empty);
});

test('renders the cumulative progress chart with target and pace legend', () => {
    renderWithHistory([
        { updateDate: Date.UTC(2026, 0, 5), value: 3, delta: 3, comment: 'Buen día' },
        { updateDate: Date.UTC(2026, 0, 12), value: 7, delta: 4 },
    ]);
    expect(screen.getByTestId('progress-chart')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: es.Objectives.chart.ariaLabel })).toBeInTheDocument();
    expect(screen.getByText(es.Objectives.chart.legendTarget)).toBeInTheDocument();
    expect(screen.getByText(es.Objectives.chart.legendPace)).toBeInTheDocument();
});

test('renders a single same-day update without a degenerate time axis', () => {
    const { container } = renderWithHistory([
        { updateDate: Date.UTC(2026, 0, 1), value: 2, delta: 2 },
    ]);

    expect(screen.getByTestId('progress-chart')).toBeInTheDocument();
    expect(container.innerHTML).not.toContain('NaN');
});

test('adds the year to day labels when the axis crosses into a new year', () => {
    const { container } = renderWithHistory(
        [{ updateDate: Date.UTC(2026, 0, 10), value: 2, delta: 2 }],
        { ...objective, createdAt: Date.UTC(2025, 11, 1), deadline: Date.UTC(2026, 1, 1) }
    );

    const tickLabels = [...container.querySelectorAll('svg text')].flatMap(node =>
        /[a-z]/.test(node.textContent) ? [node.textContent] : []
    );

    expect(tickLabels.length).toBeGreaterThan(0);
    expect(tickLabels.every(label => /\d{4}/.test(label))).toBe(true);
});

test('omits the pace legend when the deadline leaves no pace line', () => {
    renderWithHistory([{ updateDate: Date.UTC(2026, 0, 5), value: 2, delta: 2 }], {
        ...objective,
        deadline: Date.UTC(2025, 11, 1),
    });
    expect(screen.queryByText(es.Objectives.chart.legendPace)).not.toBeInTheDocument();
});
