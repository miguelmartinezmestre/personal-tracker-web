'use client';

import { QueryContent } from '@/components/query-content';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import EditObjectiveFormModal from '@/features/objectives/components/objective-form-edit-modal';
import { DataTable } from '@/components/data-table/components/table';
import { ObjectivesFilters } from './objective-filters';
import { MobilePagination } from './mobile-pagination';
import { useObjectiveListState } from '@/features/objectives/hooks/use-objective-list-state';
import type { Id } from '@/convex/_generated/dataModel';
import { useObjectiveTableColumns } from './use-objective-table-columns';
import { ObjectiveMobileCard } from './objective-mobile-card';
import { ObjectivesTrashSection } from './objectives-trash-section';

export function ResponsiveObjectivesView() {
    const t = useTranslations('Objectives');
    const {
        state,
        isError,
        retry,
        isTrashError,
        retryTrash,
        filters,
        categories,
        categoryNameById,
        handleFiltersChange,
        objectives,
        deletedObjectives,
        pagination,
        trashPagination,
        hasNextPage,
        trashHasNextPage,
        isLoading,
        isFetching,
        isTrashLoading,
        isTrashFetching,
        onNextPage,
        onNextTrashPage,
    } = useObjectiveListState();

    const [editingObjectiveId, setEditingObjectiveId] = useState<Id<'objectives'> | null>(null);
    const editingObjective =
        editingObjectiveId === null
            ? null
            : (objectives.find(objective => objective._id === editingObjectiveId) ?? null);

    const statusLabels = {
        active: t('statusOptions.active'),
        completed: t('statusOptions.completed'),
        overdue: t('statusOptions.overdue'),
    };

    const objectiveColumns = useObjectiveTableColumns({
        categoryNameById,
        onEdit: setEditingObjectiveId,
    });

    return (
        <div className="w-full min-w-0 space-y-4">
            {editingObjective ? (
                <EditObjectiveFormModal
                    defaultValues={editingObjective}
                    open
                    onOpenChange={open => {
                        if (!open) {
                            setEditingObjectiveId(null);
                        }
                    }}
                />
            ) : null}
            <ObjectivesFilters
                filters={filters}
                onFiltersChange={handleFiltersChange}
                categories={categories}
                className="w-full"
            />

            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">{t('title')}</h2>
                    {!isError && !isLoading ? (
                        <Badge variant="secondary">{objectives.length}</Badge>
                    ) : null}
                </div>
                <div className="md:hidden">
                    <QueryContent
                        state={state}
                        onRetry={retry}
                        empty={t('empty.noObjectivesFound')}
                    >
                        <div className="grid grid-cols-1 gap-4">
                            {objectives.map(objective => (
                                <ObjectiveMobileCard
                                    key={objective._id}
                                    objective={objective}
                                    categoryNameById={categoryNameById}
                                    statusLabels={statusLabels}
                                    onEdit={setEditingObjectiveId}
                                />
                            ))}
                        </div>
                    </QueryContent>
                    {
                        <MobilePagination
                            pagination={pagination}
                            rowCount={objectives.length}
                            hasNextPage={hasNextPage}
                            isLoading={isFetching}
                            onNextPage={onNextPage}
                        />
                    }
                </div>
                <div className="hidden md:block">
                    <DataTable
                        isError={isError}
                        onRetry={retry}
                        columns={objectiveColumns}
                        data={objectives}
                        isLoading={isLoading}
                        pagination={{
                            onNextPage: onNextPage,
                            onPreviousPage: pagination.previousPage,
                            hasNextPage: hasNextPage,
                            hasPreviousPage: pagination.hasPreviousPage,
                            isLoading: isFetching,
                        }}
                    />
                </div>
            </section>

            <ObjectivesTrashSection
                isTrashError={isTrashError}
                retryTrash={retryTrash}
                deletedObjectives={deletedObjectives}
                isTrashLoading={isTrashLoading}
                trashPagination={trashPagination}
                trashHasNextPage={trashHasNextPage}
                isTrashFetching={isTrashFetching}
                onNextTrashPage={onNextTrashPage}
            />
        </div>
    );
}
