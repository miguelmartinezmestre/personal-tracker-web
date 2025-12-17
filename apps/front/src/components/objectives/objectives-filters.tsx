'use client';

import * as React from 'react';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { Badge } from '@repo/ui/components/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@repo/ui/components/select';
import { Popover, PopoverContent, PopoverTrigger } from '@repo/ui/components/popover';
import { Search, Filter, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@repo/ui/lib/utils';

interface FilterOptions {
    search: string;
    status: string;
    category: string;
    deadlineRange: string;
    sortBy: string;
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
            { value: 'in_progress', label: t('statusOptions.inProgress') },
            { value: 'completed', label: t('statusOptions.completed') },
            { value: 'paused', label: t('statusOptions.paused') },
            { value: 'archived', label: t('statusOptions.archived') },
        ];

        const deadlineRangeOptions = [
            { value: 'all', label: t('deadlineRangeOptions.all') },
            { value: 'today', label: t('deadlineRangeOptions.today') },
            { value: 'week', label: t('deadlineRangeOptions.week') },
            { value: 'month', label: t('deadlineRangeOptions.month') },
            { value: 'overdue', label: t('deadlineRangeOptions.overdue') },
        ];

        const sortOptions = [
            { value: 'createdAt_desc', label: t('sortOptions.newestFirst') },
            { value: 'createdAt_asc', label: t('sortOptions.oldestFirst') },
            { value: 'deadline_asc', label: t('sortOptions.deadlineSoonest') },
            { value: 'deadline_desc', label: t('sortOptions.deadlineLatest') },
            { value: 'title_asc', label: t('sortOptions.titleAsc') },
            { value: 'title_desc', label: t('sortOptions.titleDesc') },
            { value: 'progress_desc', label: t('sortOptions.mostProgress') },
            { value: 'progress_asc', label: t('sortOptions.leastProgress') },
        ];

        const activeFiltersCount = React.useMemo(() => {
            let count = 0;
            if (filters.search) count++;
            if (filters.status && filters.status !== 'all') count++;
            if (filters.category && filters.category !== 'all') count++;
            if (filters.deadlineRange && filters.deadlineRange !== 'all') count++;
            if (filters.sortBy && filters.sortBy !== 'createdAt_desc') count++;
            return count;
        }, [filters]);

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
                sortBy: 'createdAt_desc',
            });
        };

        const removeFilter = (key: keyof FilterOptions) => {
            const defaultValues: Record<string, string> = {
                search: '',
                status: 'all',
                category: 'all',
                deadlineRange: 'all',
                sortBy: 'createdAt_desc',
            };
            handleFilterChange(key, defaultValues[key]);
        };

        return (
            <div ref={ref} className={cn('space-y-4', className)}>
                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                        placeholder={t('filters.search')}
                        value={filters.search}
                        onChange={e => handleFilterChange('search', e.target.value)}
                        className="pl-10"
                    />
                </div>

                {/* Filter Controls */}
                <div className="flex flex-wrap gap-2 items-center">
                    {/* Status Filter */}
                    <Select
                        value={filters.status}
                        onValueChange={value => handleFilterChange('status', value)}
                    >
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder={t('filters.status')} />
                        </SelectTrigger>
                        <SelectContent>
                            {statusOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Category Filter */}
                    <Select
                        value={filters.category}
                        onValueChange={value => handleFilterChange('category', value)}
                    >
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder={t('filters.category')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('categoryOptions.all')}</SelectItem>
                            {categories.map(category => (
                                <SelectItem key={category} value={category}>
                                    {category}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Deadline Range Filter */}
                    <Select
                        value={filters.deadlineRange}
                        onValueChange={value => handleFilterChange('deadlineRange', value)}
                    >
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder={t('filters.deadline')} />
                        </SelectTrigger>
                        <SelectContent>
                            {deadlineRangeOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Sort Filter */}
                    <Select
                        value={filters.sortBy}
                        onValueChange={value => handleFilterChange('sortBy', value)}
                    >
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder={t('filters.sortBy')} />
                        </SelectTrigger>
                        <SelectContent>
                            {sortOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Advanced Filters */}
                    <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="relative">
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
                                                            s => s.value === filters.status
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
                                                            d => d.value === filters.deadlineRange
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
                                        {filters.sortBy !== 'createdAt_desc' && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm">
                                                    {t('filters.sortBy')}:{' '}
                                                    {
                                                        sortOptions.find(
                                                            s => s.value === filters.sortBy
                                                        )?.label
                                                    }
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeFilter('sortBy')}
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
