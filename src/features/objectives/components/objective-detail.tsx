'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useMutation, useQuery } from '@tanstack/react-query';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DeleteConfirmationDialog } from '@/components/data-table/components/delete-confirmation-dialog';
import { QueryErrorFallback } from '@/components/ui/query-error-fallback';
import { timestampToDateInput } from '@/features/objectives/lib/dates';
import { formatObjectiveValue } from '@/features/objectives/lib/format';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import EditObjectiveFormModal from '@/features/objectives/components/objective-form-edit-modal';
import ProgressChart from '@/features/objectives/components/progress-chart';
import ProgressForm from '@/features/objectives/components/progress-form';
import ProgressList from '@/features/objectives/components/progress-list';
import { useLocale, useTranslations } from 'next-intl';

export default function ObjectiveDetail({ objectiveId }: { objectiveId: string }) {
    const t = useTranslations('Objectives');
    const locale = useLocale();
    const progressT = useTranslations('UpdateProgress');
    const router = useRouter();
    const objective = useQuery(
        convexQuery(api.objectives.getObjective, { id: objectiveId as Id<'objectives'> })
    );
    const deleteObjective = useMutation({
        meta: { handlesErrorsLocally: true },
        mutationFn: useConvexMutation(api.objectives.deleteObjective),
    });

    if (objective.isPending) {
        return <p data-testid="objective-detail-loading">{t('title')}</p>;
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
        return <p data-testid="objective-not-found">{t('notFound')}</p>;
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
                            router.push('/dashboard/objectives');
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
        progressContent = <p data-testid="objective-completed-notice">{t('completedNotice')}</p>;
    } else {
        progressContent = (
            <Card>
                <CardHeader>
                    <CardTitle>{progressT('createNewUpdateProgress')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <ProgressForm objectiveId={current.id} />
                </CardContent>
            </Card>
        );
    }
    let deadlineLabel = null;
    if (current.deadline) {
        deadlineLabel = ` · ${t('deadline')}: ${timestampToDateInput(current.deadline)}`;
    } else {
        deadlineLabel = null;
    }

    return (
        <div className="w-full min-w-0 space-y-6" data-testid="objective-detail">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                    <Link
                        href="/dashboard/objectives"
                        prefetch={false}
                        className="text-muted-foreground text-sm underline-offset-4 hover:underline"
                    >
                        {t('backToList')}
                    </Link>
                    <h1 className="text-2xl font-bold" data-testid="objective-detail-title">
                        {current.title}
                    </h1>
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge
                            variant={current.status === 'completed' ? 'default' : 'secondary'}
                            data-testid="objective-status"
                        >
                            {t(`statusOptions.${current.status}`)}
                        </Badge>
                        <span data-testid="objective-progress-percent">
                            {current.progressPercent}%
                        </span>
                        <span className="text-muted-foreground text-sm">
                            {formatObjectiveValue(current.currentValue, locale)} /{' '}
                            {formatObjectiveValue(current.targetValue, locale)}
                            {current.unit ? ` ${current.unit}` : ''}
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
            {current.description ? <p>{current.description}</p> : null}
            <p className="text-muted-foreground text-sm">
                {current.categoryName ? `${t('category')}: ${current.categoryName}` : null}
                {deadlineLabel}
            </p>
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
                <ProgressList objectiveId={current.id} />
            </section>
        </div>
    );
}
