'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DeleteConfirmationDialog } from '@/components/data-table/components/delete-confirmation-dialog';
import type { Doc, Id } from '@/convex/_generated/dataModel';
import UpdateProgressFormModal from './update-progress-form-edit-modal';
import { mapDocToUpdateProgress } from '@/features/update-progress/lib/map-doc-to-update-progress';
import { useLocale, useTranslations } from 'next-intl';
import { formatCivilDate } from '@/lib/format-date';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MOBILE_SKELETON_ITEMS = [1, 2, 3];

type MobileProgressListProps = {
    isLoading: boolean;
    isFetching: boolean;
    updates: Doc<'progressUpdates'>[];
    unitSuffix: string;
    canEdit: (authorId: Id<'user'>) => boolean;
    isDeletingProgress: boolean;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
    onPreviousPage: () => void;
    onNextPage: () => void;
    onDelete: (progressId: Id<'progressUpdates'>) => Promise<void>;
};

function MobileProgressListBody({
    isLoading,
    updates,
    unitSuffix,
    canEdit,
    isDeletingProgress,
    onDelete,
}: Pick<
    MobileProgressListProps,
    'isLoading' | 'updates' | 'unitSuffix' | 'canEdit' | 'isDeletingProgress' | 'onDelete'
>) {
    const t = useTranslations('UpdateProgress');
    const tTable = useTranslations('Table');
    const locale = useLocale();

    if (isLoading) {
        return MOBILE_SKELETON_ITEMS.map(item => (
            <div key={item} className="h-36 rounded-lg bg-muted animate-pulse" />
        ));
    }

    if (updates.length === 0) {
        return (
            <div className="py-8 text-center">
                <p className="text-muted-foreground">{tTable('noResults')}</p>
            </div>
        );
    }

    return updates.map(progressRow => {
        const defaultValues = mapDocToUpdateProgress(progressRow);

        return (
            <Card key={progressRow._id} className="w-full">
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-sm text-muted-foreground">
                                {t('table.columns.date')}
                            </p>
                            <p className="font-medium">
                                {formatCivilDate(progressRow.updateDate, locale)}
                            </p>
                        </div>
                        <div className="shrink-0 text-right">
                            <p className="text-sm text-muted-foreground">
                                {t('table.columns.currentValue')}
                            </p>
                            <p className="text-lg font-semibold">
                                {progressRow.updatedValue}
                                {unitSuffix}
                            </p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="rounded-md border p-3">
                        <p className="text-sm text-muted-foreground">
                            {t('table.columns.comment')}
                        </p>
                        <p className="mt-1 text-sm break-words">
                            {progressRow.comment?.trim() || '-'}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2 border-t pt-2">
                        {canEdit(progressRow.createdBy) ? (
                            <>
                                <UpdateProgressFormModal defaultValues={defaultValues} />
                                <DeleteConfirmationDialog
                                    onConfirm={async () => {
                                        await onDelete(progressRow._id);
                                    }}
                                    title={t('confirm.deleteTitle')}
                                    description={t('confirm.deleteDescription')}
                                    confirmLabel={t('confirm.deleteConfirm')}
                                    cancelLabel={t('confirm.cancel')}
                                    isLoading={isDeletingProgress}
                                    trigger={
                                        <Button
                                            data-testid="progress-delete-button"
                                            variant="destructive"
                                            size="sm"
                                        >
                                            {t('table.columns.delete')}
                                        </Button>
                                    }
                                />
                            </>
                        ) : null}
                    </div>
                </CardContent>
            </Card>
        );
    });
}

export function MobileProgressList(props: MobileProgressListProps) {
    const tTable = useTranslations('Table');
    const { updates, hasPreviousPage, hasNextPage, isFetching, onPreviousPage, onNextPage } = props;

    return (
        <div className="w-full min-w-0 space-y-3 md:hidden">
            <MobileProgressListBody {...props} />
            {updates.length > 0 && (hasPreviousPage || hasNextPage) ? (
                <div className="flex items-center justify-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onPreviousPage}
                        disabled={!hasPreviousPage || isFetching}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        {tTable('showing')} {updates.length} {tTable('rows')}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onNextPage}
                        disabled={!hasNextPage || isFetching}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            ) : null}
        </div>
    );
}
