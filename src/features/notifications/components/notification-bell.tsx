'use client';

import { Bell, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import { useTranslations } from 'next-intl';

function unreadCountLabel(
    count: number,
    isTruncated: boolean,
    t: ReturnType<typeof useTranslations>
): string {
    if (count <= 0) {
        return t('allCaughtUp');
    }
    if (isTruncated) {
        return t('unreadCountAtLeast', { count });
    }
    return t('unreadCount', { count });
}

export function NotificationBell() {
    const t = useTranslations('Notifications');
    const common = useTranslations('Common');
    const {
        data: overview,
        isError,
        isPending,
    } = useQuery(convexQuery(api.notifications.getNotificationOverview, {}));

    const count = overview?.unreadCount ?? 0;
    const isTruncated = overview?.isUnreadTruncated ?? false;
    let label = unreadCountLabel(count, isTruncated, t);
    if (isPending) {
        label = common('loading');
    }
    if (isError) {
        label = common('queryError');
    }

    return (
        <Button variant="ghost" size="icon" className="relative" asChild>
            <Link href="/dashboard/notifications" prefetch={false}>
                {isError ? (
                    <AlertCircle className="h-5 w-5 text-destructive" />
                ) : (
                    <Bell className="h-5 w-5" />
                )}
                {count > 0 && (
                    <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center rounded-full p-0 text-xs"
                    >
                        {count > 99 ? '99+' : count}
                    </Badge>
                )}
                <span className="sr-only">{label}</span>
            </Link>
        </Button>
    );
}
