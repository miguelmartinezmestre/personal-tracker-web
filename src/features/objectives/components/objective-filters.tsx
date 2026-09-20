'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { ActiveFiltersPopover } from './active-filters-popover';
import {
    EMPTY_OBJECTIVE_FILTERS,
    isDeadlineRangeFilter,
    isObjectiveStatusFilter,
    type FilterOptions,
} from './objective-filter-types';

interface CategoryFilterOption {
    id: string;
    label: string;
}

interface ObjectivesFiltersProps {
    filters: FilterOptions;
    onFiltersChange: (filters: FilterOptions) => void;
    categories: CategoryFilterOption[];
    className?: string;
}

function countActiveFilters(filters: FilterOptions): number {
    let activeFiltersCount = 0;
    if (filters.search) {
        activeFiltersCount++;
    }
    if (filters.status !== 'all') {
        activeFiltersCount++;
    }
    if (filters.category !== 'all') {
        activeFiltersCount++;
    }
    if (filters.deadlineRange !== 'all') {
        activeFiltersCount++;
    }
    return activeFiltersCount;
}

export function ObjectivesFilters({
    filters,
    onFiltersChange,
    categories,
    className,
}: ObjectivesFiltersProps) {
    const t = useTranslations('Objectives');
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const statusOptions = [
        { value: 'all', label: t('statusOptions.all') },
        { value: 'active', label: t('statusOptions.active') },
        { value: 'completed', label: t('statusOptions.completed') },
    ];

    const deadlineRangeOptions = [
        { value: 'all', label: t('deadlineRangeOptions.all') },
        { value: 'today', label: t('deadlineRangeOptions.today') },
        { value: 'week', label: t('deadlineRangeOptions.week') },
        { value: 'month', label: t('deadlineRangeOptions.month') },
        { value: 'overdue', label: t('deadlineRangeOptions.overdue') },
    ];

    const activeFiltersCount = countActiveFilters(filters);

    const handleStatusChange = (value: string) => {
        if (!isObjectiveStatusFilter(value)) {
            return;
        }
        onFiltersChange({ ...filters, status: value });
    };

    const handleDeadlineChange = (value: string) => {
        if (!isDeadlineRangeFilter(value)) {
            return;
        }
        onFiltersChange({ ...filters, deadlineRange: value });
    };

    const removeFilter = (key: keyof FilterOptions) => {
        onFiltersChange({
            ...filters,
            [key]: EMPTY_OBJECTIVE_FILTERS[key],
        });
    };

    return (
        <div className={cn('space-y-4', className)}>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                    placeholder={t('filters.search')}
                    value={filters.search}
                    onChange={event => onFiltersChange({ ...filters, search: event.target.value })}
                    className="pl-10"
                    aria-label={t('filters.search')}
                    data-testid="objectives-search-input"
                />
            </div>

            <div className="flex flex-wrap gap-2 items-center">
                <Select value={filters.status} onValueChange={handleStatusChange}>
                    <SelectTrigger
                        className="w-[140px]"
                        aria-label={t('filters.status')}
                        data-testid="objectives-status-filter"
                    >
                        <SelectValue placeholder={t('filters.status')} />
                    </SelectTrigger>
                    <SelectContent>
                        {statusOptions.map(option => (
                            <SelectItem
                                key={option.value}
                                value={option.value}
                                data-testid={`objectives-status-${option.value}`}
                            >
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select
                    value={filters.category}
                    onValueChange={value => onFiltersChange({ ...filters, category: value })}
                >
                    <SelectTrigger
                        className="w-[140px]"
                        aria-label={t('filters.category')}
                        data-testid="objectives-category-filter"
                    >
                        <SelectValue placeholder={t('filters.category')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all" data-testid="objectives-category-all">
                            {t('categoryOptions.all')}
                        </SelectItem>
                        {categories.map(option => (
                            <SelectItem
                                key={option.id}
                                value={option.id}
                                data-testid={`objectives-category-${option.id}`}
                            >
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={filters.deadlineRange} onValueChange={handleDeadlineChange}>
                    <SelectTrigger
                        className="w-[140px]"
                        aria-label={t('filters.deadline')}
                        data-testid="objectives-deadline-filter"
                    >
                        <SelectValue placeholder={t('filters.deadline')} />
                    </SelectTrigger>
                    <SelectContent>
                        {deadlineRangeOptions.map(option => (
                            <SelectItem
                                key={option.value}
                                value={option.value}
                                data-testid={`objectives-deadline-${option.value}`}
                            >
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <ActiveFiltersPopover
                    filters={filters}
                    activeFiltersCount={activeFiltersCount}
                    isFilterOpen={isFilterOpen}
                    onOpenChange={setIsFilterOpen}
                    onClearAll={() => onFiltersChange({ ...EMPTY_OBJECTIVE_FILTERS })}
                    onRemove={removeFilter}
                    statusOptions={statusOptions}
                    deadlineRangeOptions={deadlineRangeOptions}
                    categories={categories}
                />
            </div>
        </div>
    );
}
