'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CategorySelect } from '@/features/objectives/components/category-select';
import CreateObjectiveFormModal from '@/features/objectives/components/objective-form-create-modal';
import ObjectivesTable from '@/features/objectives/components/objectives-table';
import {
    ALL_CATEGORIES,
    OBJECTIVE_DEADLINE_FILTERS,
    OBJECTIVE_STATUS_FILTERS,
    objectivesListHref,
    parseObjectiveListFilters,
    type ObjectiveListFilters,
} from '@/features/objectives/lib/list-filters';
import { useTranslations } from 'next-intl';

const SEARCH_DELAY_MS = 300;

export default function ObjectivesLayout() {
    const t = useTranslations('Objectives');
    const searchParams = useSearchParams();

    const filters = parseObjectiveListFilters({
        status: searchParams.get('status') ?? undefined,
        deadline: searchParams.get('deadline') ?? undefined,
        category: searchParams.get('category') ?? undefined,
    });

    const selectFilters = (next: Partial<ObjectiveListFilters>) => {
        window.history.replaceState(null, '', objectivesListHref({ ...filters, ...next }));
    };

    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    // Waits for a pause in typing so each keystroke doesn't restart the paginated query.
    useEffect(() => {
        const timer = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DELAY_MS);

        return () => clearTimeout(timer);
    }, [searchInput]);

    return (
        <div className="w-full min-w-0 space-y-6">
            <div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="min-w-0 text-2xl font-bold" data-testid="objectives-title">
                    {t('title')}
                </h1>
                <div className="flex w-full gap-2 sm:w-auto">
                    <Button
                        variant="outline"
                        nativeButton={false}
                        render={<Link href="/dashboard/objectives/trash" prefetch={false} />}
                        data-testid="objectives-trash-link"
                    >
                        <Trash2 aria-hidden />
                        {t('trash.open')}
                    </Button>
                    <CreateObjectiveFormModal />
                </div>
            </div>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                    <div
                        className="flex flex-wrap gap-2"
                        role="group"
                        aria-label={t('filters.status')}
                    >
                        {OBJECTIVE_STATUS_FILTERS.map(status => (
                            <Button
                                key={status}
                                variant={filters.status === status ? 'default' : 'outline'}
                                size="sm"
                                aria-pressed={filters.status === status}
                                onClick={() => selectFilters({ status })}
                                data-testid={`objectives-filter-${status}`}
                            >
                                {t(`filters.options.${status}`)}
                            </Button>
                        ))}
                    </div>
                    <div
                        className="flex flex-wrap gap-2"
                        role="group"
                        aria-label={t('filters.deadline')}
                    >
                        {OBJECTIVE_DEADLINE_FILTERS.map(deadline => (
                            <Button
                                key={deadline}
                                variant={filters.deadline === deadline ? 'default' : 'outline'}
                                size="sm"
                                aria-pressed={filters.deadline === deadline}
                                onClick={() => selectFilters({ deadline })}
                                data-testid={`objectives-deadline-filter-${deadline}`}
                            >
                                {t(`deadlineRangeOptions.${deadline}`)}
                            </Button>
                        ))}
                    </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                    <CategorySelect
                        id="objectives-category-filter"
                        value={filters.category}
                        onValueChange={category => selectFilters({ category })}
                        firstOption={{ value: ALL_CATEGORIES, label: t('categoryOptions.all') }}
                        ariaLabel={t('category')}
                        testId="objectives-category-filter"
                    />
                    <Input
                        type="search"
                        value={searchInput}
                        onChange={event => setSearchInput(event.target.value)}
                        placeholder={t('filters.search')}
                        aria-label={t('filters.search')}
                        maxLength={100}
                        className="sm:max-w-xs"
                        data-testid="objectives-search"
                    />
                </div>
            </div>
            <ObjectivesTable filters={filters} search={search} />
        </div>
    );
}
