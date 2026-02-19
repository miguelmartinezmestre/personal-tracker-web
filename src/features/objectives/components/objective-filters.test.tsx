import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ObjectivesFilters } from './objective-filters';

vi.mock('next-intl', () => ({
    useTranslations: (namespace: string) => (key: string) => {
        const labels: Record<string, string> = {
            'Objectives.filters.search': 'Search objectives',
            'Objectives.filters.status': 'Status',
            'Objectives.filters.category': 'Category',
            'Objectives.filters.deadline': 'Deadline',
            'Objectives.filtersUi.button': 'Filters',
            'Objectives.statusOptions.all': 'All',
            'Objectives.statusOptions.active': 'Active',
            'Objectives.statusOptions.completed': 'Completed',
            'Objectives.statusOptions.paused': 'Paused',
            'Objectives.statusOptions.archived': 'Archived',
            'Objectives.categoryOptions.all': 'All categories',
            'Objectives.deadlineRangeOptions.all': 'Any time',
            'Objectives.deadlineRangeOptions.today': 'Today',
            'Objectives.deadlineRangeOptions.week': 'This week',
            'Objectives.deadlineRangeOptions.month': 'This month',
            'Objectives.deadlineRangeOptions.overdue': 'Overdue',
            'Common.search': 'Search',
        };

        return labels[`${namespace}.${key}`] ?? `${namespace}.${key}`;
    },
}));

describe('ObjectivesFilters', () => {
    it('shows active filters badge count', () => {
        render(
            <ObjectivesFilters
                filters={{
                    search: 'goal',
                    status: 'active',
                    category: 'work',
                    deadlineRange: 'all',
                }}
                onFiltersChange={vi.fn()}
                categories={['work', 'health']}
            />
        );

        expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('updates search filter through callback', async () => {
        const user = userEvent.setup();
        const onFiltersChange = vi.fn();

        function StatefulFilters() {
            const [filters, setFilters] = useState({
                search: '',
                status: 'all',
                category: 'all',
                deadlineRange: 'all',
            });

            return (
                <ObjectivesFilters
                    filters={filters}
                    onFiltersChange={next => {
                        setFilters(next);
                        onFiltersChange(next);
                    }}
                    categories={['work', 'health']}
                />
            );
        }

        render(<StatefulFilters />);

        await user.type(screen.getByTestId('objectives-search-input'), 'health');

        expect(onFiltersChange).toHaveBeenLastCalledWith({
            search: 'health',
            status: 'all',
            category: 'all',
            deadlineRange: 'all',
        });
    });
});
