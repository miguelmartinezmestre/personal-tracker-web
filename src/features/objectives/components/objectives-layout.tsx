'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import CreateObjectiveFormModal from '@/features/objectives/components/objective-form-create-modal';
import ObjectivesTable from '@/features/objectives/components/objectives-table';
import type { ObjectiveStatusFilter } from '@/features/objectives/hooks/use-objectives';
import { useTranslations } from 'next-intl';

const filters: ObjectiveStatusFilter[] = ['all', 'active', 'completed'];

export default function ObjectivesLayout() {
    const t = useTranslations('Objectives');
    const [status, setStatus] = useState<ObjectiveStatusFilter>('all');

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
                {filters.map(filter => (
                    <Button
                        key={filter}
                        variant={status === filter ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setStatus(filter)}
                        data-testid={`objectives-filter-${filter}`}
                    >
                        {t(`statusOptions.${filter}`)}
                    </Button>
                ))}
            </div>
            <ObjectivesTable status={status} />
        </div>
    );
}
