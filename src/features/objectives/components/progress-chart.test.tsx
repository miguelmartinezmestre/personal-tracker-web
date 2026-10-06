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
    points: { updateDate: number; value: number; delta: number; comment?: string }[]
) {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { staleTime: Number.POSITIVE_INFINITY, retry: false } },
    });
    queryClient.setQueryData(
        convexQuery(api.objectives.getProgressHistory, { objectiveId }).queryKey,
        {
            points: points.map((point, index) => ({
                id: `progress-${index}` as Id<'progressUpdates'>,
                ...point,
            })),
            truncated: false,
        }
    );
    return render(
        <QueryClientProvider client={queryClient}>
            <NextIntlClientProvider locale="es" messages={es}>
                <ProgressChart objective={objective} />
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

test('never extends the value axis below zero', () => {
    // Totals reconstructed from float increments can land a hair below zero.
    const { container } = renderWithHistory([
        { updateDate: Date.UTC(2026, 0, 2), value: -2.7755575615628914e-17, delta: 0 },
        { updateDate: Date.UTC(2026, 0, 3), value: 0.3, delta: 0.3 },
    ]);
    const tickLabels = [...container.querySelectorAll('svg text')].map(node => node.textContent);
    expect(tickLabels).toContain('0');
    expect(tickLabels.filter(label => label.startsWith('-'))).toEqual([]);
});
