'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Filter, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { FilterOptions } from './objective-filter-types';

type FilterOption = {
    value: string;
    label: string;
};

type CategoryFilterOption = {
    id: string;
    label: string;
};

type ActiveFiltersPopoverProps = {
    filters: FilterOptions;
    activeFiltersCount: number;
    isFilterOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onClearAll: () => void;
    onRemove: (key: keyof FilterOptions) => void;
    statusOptions: FilterOption[];
    deadlineRangeOptions: FilterOption[];
    categories: CategoryFilterOption[];
};

export function ActiveFiltersPopover({
    filters,
    activeFiltersCount,
    isFilterOpen,
    onOpenChange,
    onClearAll,
    onRemove,
    statusOptions,
    deadlineRangeOptions,
    categories,
}: ActiveFiltersPopoverProps) {
    const t = useTranslations('Objectives');
    const tCommon = useTranslations('Common');
    const selectedStatus = statusOptions.find(option => option.value === filters.status);
    const selectedDeadline = deadlineRangeOptions.find(
        option => option.value === filters.deadlineRange
    );
    const selectedCategory = categories.find(option => option.id === filters.category);

    return (
        <Popover open={isFilterOpen} onOpenChange={onOpenChange}>
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
                            <Button variant="ghost" size="sm" onClick={onClearAll}>
                                {t('filtersUi.clearAll')}
                            </Button>
                        )}
                    </div>

                    {activeFiltersCount === 0 ? (
                        <p className="text-sm text-muted-foreground">{t('filtersUi.noActive')}</p>
                    ) : (
                        <div className="space-y-2">
                            {filters.search ? (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm">
                                        {tCommon('search')}: &quot;{filters.search}&quot;
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onRemove('search')}
                                        aria-label={t('filtersUi.remove', {
                                            filter: tCommon('search'),
                                        })}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            ) : null}
                            {filters.status !== 'all' ? (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm">
                                        {t('filters.status')}: {selectedStatus?.label}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onRemove('status')}
                                        aria-label={t('filtersUi.remove', {
                                            filter: t('filters.status'),
                                        })}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            ) : null}
                            {filters.category !== 'all' ? (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm">
                                        {t('filters.category')}:{' '}
                                        {selectedCategory?.label ?? filters.category}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onRemove('category')}
                                        aria-label={t('filtersUi.remove', {
                                            filter: t('filters.category'),
                                        })}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            ) : null}
                            {filters.deadlineRange !== 'all' ? (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm">
                                        {t('filters.deadline')}: {selectedDeadline?.label}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onRemove('deadlineRange')}
                                        aria-label={t('filtersUi.remove', {
                                            filter: t('filters.deadline'),
                                        })}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            ) : null}
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
