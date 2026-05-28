'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, Filter, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface FilterOptions {
    search: string;
    status: string;
    category: string;
    deadlineRange: string;
}

interface ObjectivesFiltersProps {
    filters: FilterOptions;
    onFiltersChange: (filters: FilterOptions) => void;
    categories: string[];
    className?: string;
}

const ObjectivesFilters = React.forwardRef<HTMLDivElement, ObjectivesFiltersProps>(
    ({ filters, onFiltersChange, categories, className }, ref) => {
        const t = useTranslations('Objectives');
        const tCommon = useTranslations('Common');
        const [isFilterOpen, setIsFilterOpen] = React.useState(false);

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

        let activeFiltersCount = 0;
        if (filters.search) activeFiltersCount++;
        if (filters.status && filters.status !== 'all') activeFiltersCount++;
        if (filters.category && filters.category !== 'all') activeFiltersCount++;
        if (filters.deadlineRange && filters.deadlineRange !== 'all') activeFiltersCount++;

        const handleFilterChange = (key: keyof FilterOptions, value: string) => {
            onFiltersChange({
                ...filters,
                [key]: value,
            });
        };

        const clearAllFilters = () => {
            onFiltersChange({
                search: '',
                status: 'all',
                category: 'all',
                deadlineRange: 'all',
            });
        };

        const removeFilter = (key: keyof FilterOptions) => {
            const defaultValues: Record<string, string> = {
                search: '',
                status: 'all',
                category: 'all',
                deadlineRange: 'all',
            };
            handleFilterChange(key as keyof FilterOptions, defaultValues[key] ?? '');
        };

        return (
            <div ref={ref} className={cn('space-y-4', className)}>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                        placeholder={t('filters.search')}
                        value={filters.search}
                        onChange={e => handleFilterChange('search', e.target.value)}
                        className="pl-10"
                        data-testid="objectives-search-input"
                    />
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                    <Select
                        value={filters.status}
                        onValueChange={value => handleFilterChange('status', value)}
                    >
                        <SelectTrigger className="w-[140px]" data-testid="objectives-status-filter">
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
                        onValueChange={value => handleFilterChange('category', value)}
                    >
                        <SelectTrigger
                            className="w-[140px]"
                            data-testid="objectives-category-filter"
                        >
                            <SelectValue placeholder={t('filters.category')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all" data-testid="objectives-category-all">
                                {t('categoryOptions.all')}
                            </SelectItem>
                            {categories.map(category => (
                                <SelectItem
                                    key={category}
                                    value={category}
                                    data-testid={`objectives-category-${category}`}
                                >
                                    {category}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={filters.deadlineRange}
                        onValueChange={value => handleFilterChange('deadlineRange', value)}
                    >
                        <SelectTrigger
                            className="w-[140px]"
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

                    <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="relative"
                                data-testid="objectives-active-filters-button"
                            >
                                <Filter className="h-4 w-4 mr-2" />
                                {t('filtersUi.button')}
                                {activeFiltersCount > 0 && (
                                    <Badge
                                        variant="secondary"
                                        className="ml-2 h-5 w-5 rounded-full p-0 text-xs"
                                    >
                                        {activeFiltersCount}
                                    </Badge>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80" align="start">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-medium">{t('filtersUi.activeTitle')}</h4>
                                    {activeFiltersCount > 0 && (
                                        <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                                            {t('filtersUi.clearAll')}
                                        </Button>
                                    )}
                                </div>

                                {activeFiltersCount === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        {t('filtersUi.noActive')}
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {filters.search && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm">
                                                    {tCommon('search')}: &quot;{filters.search}
                                                    &quot;
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeFilter('search')}
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        )}
                                        {filters.status !== 'all' && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm">
                                                    {t('filters.status')}:{' '}
                                                    {
                                                        statusOptions.find(
                                                            statusOption =>
                                                                statusOption.value ===
                                                                filters.status
                                                        )?.label
                                                    }
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeFilter('status')}
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        )}
                                        {filters.category !== 'all' && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm">
                                                    {t('filters.category')}: {filters.category}
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeFilter('category')}
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        )}
                                        {filters.deadlineRange !== 'all' && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm">
                                                    {t('filters.deadline')}:{' '}
                                                    {
                                                        deadlineRangeOptions.find(
                                                            deadlineOption =>
                                                                deadlineOption.value ===
                                                                filters.deadlineRange
                                                        )?.label
                                                    }
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeFilter('deadlineRange')}
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
        );
    }
);
ObjectivesFilters.displayName = 'ObjectivesFilters';

export { ObjectivesFilters, type FilterOptions };
