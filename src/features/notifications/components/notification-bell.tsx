'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { useTranslations } from 'next-intl';
import { buttonVariants } from '@/components/ui/button';
import { api } from '@/convex/_generated/api';
import { cn } from '@/lib/utils';

const BADGE_LIMIT = 99;

export function NotificationBell() {
    const t = useTranslations('Notifications');
    const unread = useQuery(convexQuery(api.notifications.countUnreadNotifications, {}));
    const count = unread.data ?? 0;

    return (
        <Link
            href="/dashboard/notifications"
            className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'relative')}
            aria-label={t('bell', { count })}
            data-testid="notification-bell"
        >
            <Bell className="size-4" aria-hidden />
            {count > 0 && (
                <span
                    className="bg-destructive text-destructive-foreground absolute -top-0.5 -right-0.5 min-w-4 rounded-full px-1 text-center text-[10px] leading-4 font-semibold"
                    aria-hidden
                    data-testid="notification-bell-count"
                >
                    {count > BADGE_LIMIT ? `${BADGE_LIMIT}+` : count}
                </span>
            )}
        </Link>
    );
}
