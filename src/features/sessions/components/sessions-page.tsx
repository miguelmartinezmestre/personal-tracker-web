'use client';

import { toast } from 'sonner';
import { Bot, Monitor, Smartphone, Tablet } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useMutation } from '@tanstack/react-query';
import { useConvexMutation } from '@convex-dev/react-query';
import type { FunctionReturnType } from 'convex/server';
import { useLocale, useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table/components/table';
import { DeleteConfirmationDialog } from '@/components/data-table/components/delete-confirmation-dialog';
import type { DataTableFeatures } from '@/components/data-table/data-table-features';
import { usePaginatedList } from '@/components/data-table/hooks/use-paginated-list';
import { api } from '@/convex/_generated/api';
import { describeUserAgent, type DeviceKind } from '@/features/sessions/lib/user-agent';

type SessionItem = FunctionReturnType<typeof api.sessions.listMySessions>['page'][number];

const DEVICE_ICONS: Record<DeviceKind, typeof Monitor> = {
    desktop: Monitor,
    mobile: Smartphone,
    tablet: Tablet,
    bot: Bot,
};

function SessionDevice({ userAgent }: { userAgent: string | null }) {
    const t = useTranslations('Sessions');
    const { device, browser, system } = describeUserAgent(userAgent ?? '');
    const Icon = DEVICE_ICONS[device];
    const details = [browser, system].filter(Boolean).join(' · ');

    return (
        <div className="flex min-w-0 items-center gap-2">
            <Icon className="size-5 shrink-0" aria-hidden />
            <div className="min-w-0">
                <span className="block font-medium">{t(`devices.${device}`)}</span>
                <span className="text-muted-foreground block truncate text-xs">
                    {details || t('unknownAgent')}
                </span>
            </div>
        </div>
    );
}

/** The user's own sessions: when they started and were last used, from where, and closing them. */
export default function SessionsPage() {
    const t = useTranslations('Sessions');
    const locale = useLocale();
    const sessions = usePaginatedList(api.sessions.listMySessions, {});
    const formatDate = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });

    const revoke = useMutation({
        meta: { handlesErrorsLocally: true },
        mutationFn: useConvexMutation(api.sessions.revokeSession),
    });

    const revokeOthers = useMutation({
        meta: { handlesErrorsLocally: true },
        mutationFn: useConvexMutation(api.sessions.revokeOtherSessions),
    });

    const columns: ColumnDef<DataTableFeatures, SessionItem>[] = [
        {
            id: 'device',
            header: t('device'),
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <SessionDevice userAgent={row.original.userAgent} />
                    {row.original.isCurrent ? (
                        <Badge data-testid="session-current">{t('current')}</Badge>
                    ) : null}
                </div>
            ),
        },
        {
            id: 'lastActive',
            header: t('lastActive'),
            cell: ({ row }) => formatDate.format(row.original.updatedAt),
        },
        {
            id: 'createdAt',
            header: t('started'),
            cell: ({ row }) => formatDate.format(row.original.createdAt),
        },
        {
            id: 'actions',
            header: '',
            cell: ({ row }) =>
                row.original.isCurrent ? null : (
                    <DeleteConfirmationDialog
                        title={t('revokeTitle')}
                        description={t('revokeDescription')}
                        confirmLabel={t('revoke')}
                        cancelLabel={t('cancel')}
                        isLoading={revoke.isPending}
                        trigger={
                            <Button variant="outline" size="sm" data-testid="session-revoke-button">
                                {t('revoke')}
                            </Button>
                        }
                        onConfirm={async () => {
                            try {
                                await revoke.mutateAsync({ sessionId: row.original.id });
                                toast.success(t('revoked'));
                            } catch {
                                toast.error(t('revokeFailed'));
                            }
                        }}
                    />
                ),
        },
    ];

    return (
        <div className="w-full min-w-0 space-y-6" data-testid="sessions-page">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold">{t('title')}</h1>
                    <p className="text-muted-foreground">{t('description')}</p>
                </div>
                <DeleteConfirmationDialog
                    title={t('revokeOthersTitle')}
                    description={t('revokeOthersDescription')}
                    confirmLabel={t('revokeOthers')}
                    cancelLabel={t('cancel')}
                    isLoading={revokeOthers.isPending}
                    trigger={
                        <Button variant="destructive" data-testid="sessions-revoke-others">
                            {t('revokeOthers')}
                        </Button>
                    }
                    onConfirm={async () => {
                        try {
                            await revokeOthers.mutateAsync({});
                            toast.success(t('revokedOthers'));
                        } catch {
                            toast.error(t('revokeFailed'));
                        }
                    }}
                />
            </div>
            <DataTable
                columns={columns}
                data={sessions.data}
                columnClassNames={{ createdAt: 'hidden md:table-cell' }}
                isLoading={sessions.isLoading}
                pagination={sessions}
                emptyMessage={t('empty')}
            />
        </div>
    );
}
