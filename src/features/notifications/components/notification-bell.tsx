'use client';

import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';

export function NotificationBell() {
  const { data } = useQuery(convexQuery(api.notifications.getUnreadNotificationCount, {}));

  const count = data?.count ?? 0;

  return (
    <Button variant="ghost" size="icon" className="relative" asChild>
      <Link href="/dashboard/notifications" prefetch={false}>
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center rounded-full p-0 text-xs"
          >
            {count > 99 ? '99+' : count}
          </Badge>
        )}
        <span className="sr-only">
          {count > 0 ? `${count} unread notifications` : 'No unread notifications'}
        </span>
      </Link>
    </Button>
  );
}
