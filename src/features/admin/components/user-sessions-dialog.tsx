'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';
import { useConvexMutation } from '@convex-dev/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { QueryErrorBoundary } from '@/components/query-error-boundary';
import { usePaginatedList } from '@/components/data-table/hooks/use-paginated-list';
import { LoadMorePagination } from '@/components/data-table/components/load-more-pagination';
import { api } from '@/convex/_generated/api';
import { describeUserAgent } from '@/features/sessions/lib/user-agent';

function SessionsList({ userId }: { userId: string }) {
    const t = useTranslations('Admin.sessions');
    const tSessions = useTranslations('Sessions');
    const locale = useLocale();
    const sessions = usePaginatedList(api.admin.listUserSessions, { userId });
    const revoke = useMutation({ mutationFn: useConvexMutation(api.admin.revokeUserSession) });
    const formatDate = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });

    if (!sessions.isLoading && sessions.data.length === 0) {
        return <p className="text-muted-foreground text-sm">{t('empty')}</p>;
    }

    return (
        <div className="space-y-3">
            <ul className="divide-y" data-testid="admin-sessions-list">
                {sessions.data.map(session => {
                    const { device, browser, system } = describeUserAgent(session.userAgent ?? '');

                    return (
                        <li key={session.id} className="flex items-center gap-3 py-2 text-sm">
                            <div className="min-w-0 flex-1">
                                <span className="block font-medium">
                                    {tSessions(`devices.${device}`)}
                                    {[browser, system].filter(Boolean).length > 0
                                        ? ` · ${[browser, system].filter(Boolean).join(' · ')}`
                                        : ''}
                                </span>
                                <span className="text-muted-foreground block text-xs">
                                    {t('details', {
                                        ip: session.ipAddress ?? '—',
                                        expires: formatDate.format(session.expiresAt),
                                    })}
                                </span>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={revoke.isPending}
                                onClick={() =>
                                    revoke.mutate(
                                        { sessionId: session.id },
                                        { onSuccess: () => toast.success(t('revoked')) }
                                    )
                                }
                            >
                                {t('revoke')}
                            </Button>
                        </li>
                    );
                })}
            </ul>
            <LoadMorePagination pagination={sessions} rowCount={sessions.data.length} />
        </div>
    );
}

export default function UserSessionsDialog({ userId, name }: { userId: string; name: string }) {
    const t = useTranslations('Admin.sessions');
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
                render={
                    <Button variant="outline" size="sm" data-testid="admin-sessions-open">
                        {t('open')}
                    </Button>
                }
            />
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{t('title', { name })}</DialogTitle>
                    <DialogDescription>{t('description')}</DialogDescription>
                </DialogHeader>
                {open ? (
                    <QueryErrorBoundary>
                        <SessionsList userId={userId} />
                    </QueryErrorBoundary>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}
