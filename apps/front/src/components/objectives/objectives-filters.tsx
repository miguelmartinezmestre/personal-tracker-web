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

const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'paused', label: 'Paused' },
    { value: 'archived', label: 'Archived' },
];

const deadlineRangeOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Due Today' },
    { value: 'week', label: 'Due This Week' },
    { value: 'month', label: 'Due This Month' },
    { value: 'overdue', label: 'Overdue' },
];

const sortOptions = [
    { value: 'createdAt_desc', label: 'Newest First' },
    { value: 'createdAt_asc', label: 'Oldest First' },
    { value: 'deadline_asc', label: 'Deadline Soonest' },
    { value: 'deadline_desc', label: 'Deadline Latest' },
    { value: 'title_asc', label: 'Title A-Z' },
    { value: 'title_desc', label: 'Title Z-A' },
    { value: 'progress_desc', label: 'Most Progress' },
    { value: 'progress_asc', label: 'Least Progress' },
];

const ObjectivesFilters = React.forwardRef<HTMLDivElement, ObjectivesFiltersProps>(
    ({ filters, onFiltersChange, categories, className }, ref) => {
        const [isFilterOpen, setIsFilterOpen] = React.useState(false);

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
                        placeholder="Search objectives..."
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
                            <SelectValue placeholder="Status" />
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
                            <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
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
                            <SelectValue placeholder="Deadline" />
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
                            <SelectValue placeholder="Sort by" />
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
                                Filters
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
                                    <h4 className="font-medium">Active Filters</h4>
                                    {activeFiltersCount > 0 && (
                                        <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                                            Clear All
                                        </Button>
                                    )}
                                </div>

                                {activeFiltersCount === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        No active filters
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {filters.search && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm">
                                                    Search: "{filters.search}"
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
                                                    Status:{' '}
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
                                                    Category: {filters.category}
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
                                                    Deadline:{' '}
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
                                                    Sort:{' '}
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
