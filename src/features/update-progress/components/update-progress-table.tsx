'use client';

import { QueryErrorFallback } from '@/components/ui/query-error-fallback';
import { DataTable } from '@/components/data-table/components/table';
import type { ObjectiveWithCapabilities } from '@/features/objectives/types/objective-with-capabilities';
import type { Id } from '@/convex/_generated/dataModel';
import { canEditProgressRow } from '../lib/progress-points';
import { MobileProgressList } from './mobile-progress-list';
import { UpdateProgressCharts } from './update-progress-charts';
import { useUpdateProgressTableData } from '../hooks/use-update-progress-table-data';

type UpdateProgressTableProps = {
    objective: ObjectiveWithCapabilities | null;
    currentUserId: Id<'user'> | null;
};

export default function UpdateProgressTable({
    objective: objectiveProp,
    currentUserId,
}: UpdateProgressTableProps) {
    const {
        isError,
        retry,
        nextPage,
        previousPage,
        hasPreviousPage,
        continueCursor,
        pageIsDone,
        hasNextPage,
        updateProgress,
        deleteUpdateProgressAsync,
        isDeletingProgress,
        objectiveDoc,
        columns,
        updates,
        progressData,
        isTruncated,
        lastUpdated,
        unitSuffix,
    } = useUpdateProgressTableData(objectiveProp, currentUserId);

    if (isError) {
        return <QueryErrorFallback onRetry={retry} />;
    }
    return (
        <div className="w-full min-w-0 space-y-4">
            <UpdateProgressCharts
                progressData={progressData}
                isTruncated={isTruncated}
                objectiveDoc={objectiveDoc}
                lastUpdated={lastUpdated}
            />

            <MobileProgressList
                isLoading={updateProgress.isLoading}
                isFetching={updateProgress.isFetching}
                updates={updates}
                unitSuffix={unitSuffix}
                canEdit={authorId => canEditProgressRow(authorId, objectiveDoc, currentUserId)}
                isDeletingProgress={isDeletingProgress}
                hasPreviousPage={hasPreviousPage}
                hasNextPage={hasNextPage}
                onPreviousPage={previousPage}
                onNextPage={() => nextPage(continueCursor, pageIsDone)}
                onDelete={async progressId => {
                    await deleteUpdateProgressAsync({ _id: progressId });
                }}
            />

            <div className="hidden w-full min-w-0 md:block">
                <DataTable
                    columns={columns}
                    data={updates}
                    isLoading={updateProgress.isLoading}
                    pagination={{
                        onNextPage: () => nextPage(continueCursor, pageIsDone),
                        onPreviousPage: previousPage,
                        hasNextPage,
                        hasPreviousPage,
                        isLoading: updateProgress.isFetching,
                    }}
                />
            </div>
        </div>
    );
}
