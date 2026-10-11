'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useMutation, useQuery } from '@tanstack/react-query';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { PartyPopper } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DeleteConfirmationDialog } from '@/components/data-table/components/delete-confirmation-dialog';
import { QueryErrorFallback } from '@/components/ui/query-error-fallback';
import { isOverdue } from '@/features/objectives/lib/dates';
import {
    formatInstantDate,
    formatObjectiveDate,
    formatObjectiveValue,
} from '@/features/objectives/lib/format';
import { api } from '@/convex/_generated/api';
import EditObjectiveFormModal from '@/features/objectives/components/objective-form-edit-modal';
import ProgressChart from '@/features/objectives/components/progress-chart';
import ProgressForm from '@/features/objectives/components/progress-form';
import ProgressList from '@/features/objectives/components/progress-list';
import { useLocale, useTranslations } from 'next-intl';

export default function ObjectiveDetail({
    objectiveId,
    listHref,
}: {
    objectiveId: string;
    // The list URL the user came from, so going back keeps its status filter.
    listHref: Route;
}) {
    const t = useTranslations('Objectives');
    const locale = useLocale();
    const progressT = useTranslations('UpdateProgress');
    const router = useRouter();
    const objective = useQuery(convexQuery(api.objectives.getObjective, { id: objectiveId }));
    const deleteObjective = useMutation({
        meta: { handlesErrorsLocally: true },
        mutationFn: useConvexMutation(api.objectives.deleteObjective),
    });

    if (objective.isPending) {
        return <ObjectiveDetailSkeleton />;
    }
    if (objective.isError) {
        return (
            <QueryErrorFallback
                error={objective.error}
                onRetry={() => {
                    void objective.refetch();
                }}
            />
        );
    }
    if (!objective.data) {
        return <ObjectiveNotFound listHref={listHref} />;
    }

    const current = objective.data;
    let managementActions = null;
    if (current.canManage) {
        managementActions = (
            <div className="flex gap-2">
                <EditObjectiveFormModal objective={current} />
                <DeleteConfirmationDialog
                    title={t('confirm.deleteObjective')}
                    description={t('confirm.deletePermanentDescription')}
                    confirmLabel={t('confirm.deleteConfirm')}
                    cancelLabel={t('confirm.cancel')}
                    isLoading={deleteObjective.isPending}
                    trigger={
                        <Button
                            variant="destructive"
                            size="sm"
                            data-testid="objective-delete-button"
                        >
                            {t('deleteObjective')}
                        </Button>
                    }
                    onConfirm={async () => {
                        try {
                            await deleteObjective.mutateAsync({ id: current.id });
                            toast.success(t('toast.deleted'));
                            router.push(listHref);
                        } catch {
                            toast.error(t('toast.deleteFailed'));
                        }
                    }}
                />
            </div>
        );
    }
    let progressContent;
    if (current.status === 'completed') {
        progressContent = <CompletedNotice />;
    } else {
        progressContent = (
            <Card>
                <CardHeader>
                    <CardTitle>{progressT('createNewUpdateProgress')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <ProgressForm
                        objectiveId={current.id}
                        currentValue={current.currentValue}
                        targetValue={current.targetValue}
                        unit={current.unit}
                    />
                </CardContent>
            </Card>
        );
    }
    const details = [
        current.categoryName ? `${t('category')}: ${current.categoryName}` : null,
        current.deadline !== undefined
            ? `${t('deadline')}: ${formatObjectiveDate(current.deadline, locale)}`
            : null,
        current.completedAt !== undefined
            ? t('completedOn', { date: formatInstantDate(current.completedAt, locale) })
            : null,
    ].filter(detail => detail !== null);
    const unitSuffix = current.unit ? ` ${current.unit}` : '';

    return (
        <div className="w-full min-w-0 space-y-6" data-testid="objective-detail">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                    <Link
                        href={listHref}
                        prefetch={false}
                        className="text-muted-foreground text-sm underline-offset-4 hover:underline"
                    >
                        {t('backToList')}
                    </Link>
                    <h1
                        className="text-2xl font-bold wrap-anywhere"
                        data-testid="objective-detail-title"
                    >
                        {current.title}
                    </h1>
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge
                            variant={current.status === 'completed' ? 'default' : 'secondary'}
                            data-testid="objective-status"
                        >
                            {t(`statusOptions.${current.status}`)}
                        </Badge>
                        {isOverdue(current) ? (
                            <Badge variant="destructive" data-testid="objective-overdue">
                                {t('statusOptions.overdue')}
                            </Badge>
                        ) : null}
                        <span data-testid="objective-progress-percent">
                            {current.progressPercent}%
                        </span>
                        <span
                            className="text-muted-foreground text-sm"
                            data-testid="objective-values"
                        >
                            {formatObjectiveValue(current.currentValue, locale)} /{' '}
                            {formatObjectiveValue(current.targetValue, locale)}
                            {unitSuffix}
                            {/* Without the start, "50 / 100" next to 0% reads as a mistake. */}
                            {current.startValue !== 0
                                ? ` · ${t('initialValue')}: ${formatObjectiveValue(current.startValue, locale)}${unitSuffix}`
                                : null}
                        </span>
                    </div>
                </div>
                {managementActions}
            </div>
            <div className="bg-muted h-2 overflow-hidden rounded-full">
                <div
                    className="bg-primary h-full"
                    style={{ width: `${current.progressPercent}%` }}
                    data-testid="objective-progress-bar"
                />
            </div>
            {current.description ? (
                <p className="whitespace-pre-line wrap-anywhere">{current.description}</p>
            ) : null}
            {details.length > 0 ? (
                <p className="text-muted-foreground text-sm">{details.join(' · ')}</p>
            ) : null}
            <Card>
                <CardHeader>
                    <CardTitle>{t('chart.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <ProgressChart objective={current} />
                </CardContent>
            </Card>
            {progressContent}
            <section className="space-y-3">
                <h2 className="text-lg font-semibold">{t('objectiveProgress')}</h2>
                <ProgressList objectiveId={current.id} unit={current.unit} />
            </section>
        </div>
    );
}

function ObjectiveDetailSkeleton() {
    return (
        <div className="w-full space-y-4" data-testid="objective-detail-loading">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-72 w-full" />
        </div>
    );
}

function CompletedNotice() {
    const t = useTranslations('Objectives');
    return (
        <Alert data-testid="objective-completed-notice">
            <PartyPopper className="h-4 w-4" />
            <AlertTitle>{t('completedTitle')}</AlertTitle>
            <AlertDescription>{t('completedNotice')}</AlertDescription>
        </Alert>
    );
}

function ObjectiveNotFound({ listHref }: { listHref: Route }) {
    const t = useTranslations('Objectives');
    return (
        <div className="space-y-3" data-testid="objective-not-found">
            <p>{t('notFound')}</p>
            <Link
                href={listHref}
                prefetch={false}
                className="text-sm text-primary underline-offset-4 hover:underline"
            >
                {t('backToList')}
            </Link>
        </div>
    );
}
