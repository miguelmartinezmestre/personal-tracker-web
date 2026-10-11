'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import CreateObjectiveFormModal from '@/features/objectives/components/objective-form-create-modal';
import ObjectivesTable from '@/features/objectives/components/objectives-table';
import {
    OBJECTIVE_STATUS_FILTERS,
    type ObjectiveStatusFilter,
} from '@/features/objectives/lib/status-filter';
import { useTranslations } from 'next-intl';

export default function ObjectivesLayout({
    initialStatus,
}: {
    initialStatus: ObjectiveStatusFilter;
}) {
    const t = useTranslations('Objectives');
    const [status, setStatus] = useState(initialStatus);
    // The filter lives in the URL so a reload or the back button keeps it.
    const selectStatus = (next: ObjectiveStatusFilter) => {
        setStatus(next);
        const url = new URL(window.location.href);
        if (next === 'all') {
            url.searchParams.delete('status');
        } else {
            url.searchParams.set('status', next);
        }
        window.history.replaceState(null, '', url);
    };

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
            <ObjectivesTable status={status} />
        </div>
    );
}
