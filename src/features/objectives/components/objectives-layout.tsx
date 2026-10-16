'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CreateObjectiveFormModal from '@/features/objectives/components/objective-form-create-modal';
import ObjectivesTable from '@/features/objectives/components/objectives-table';
import {
    OBJECTIVE_STATUS_FILTERS,
    parseObjectiveStatusFilter,
    type ObjectiveStatusFilter,
} from '@/features/objectives/lib/status-filter';
import { useTranslations } from 'next-intl';

const SEARCH_DELAY_MS = 300;

export default function ObjectivesLayout() {
    const t = useTranslations('Objectives');
    // The filter lives only in the URL, so links that drop `status` also reset it.
    const status = parseObjectiveStatusFilter(useSearchParams().get('status') ?? undefined);
    const selectStatus = (next: ObjectiveStatusFilter) => {
        const url = new URL(window.location.href);
        if (next === 'all') {
            url.searchParams.delete('status');
        } else {
            url.searchParams.set('status', next);
        }
        window.history.replaceState(null, '', url);
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
                <div className="w-full sm:w-auto">
                    <CreateObjectiveFormModal />
                </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2" role="group" aria-label={t('filters.status')}>
                    {OBJECTIVE_STATUS_FILTERS.map(filter => (
                        <Button
                            key={filter}
                            variant={status === filter ? 'default' : 'outline'}
                            size="sm"
                            aria-pressed={status === filter}
                            onClick={() => selectStatus(filter)}
                            data-testid={`objectives-filter-${filter}`}
                        >
                            {t(`filters.options.${filter}`)}
                        </Button>
                    ))}
                </div>
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
            <ObjectivesTable status={status} search={search} />
        </div>
    );
}
