'use client';

import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import { toast } from 'sonner';

export function NotificationSonnerListener() {
  const { data } = useQuery(
    convexQuery(api.notifications.getNotificationsByUser, {
      paginationOpts: { numItems: 1, cursor: null },
    })
  );

  const initializedRef = useRef(false);
  const lastIdRef = useRef<string | null>(null);
  const latest = data?.page?.[0];
  const latestId = latest ? String(latest._id) : null;
  const hasLatest = latestId !== null;
  const latestIsRead = latest?.read ?? true;
  const latestMessage = latest?.message ?? '';

  useEffect(() => {
    if (!hasLatest || !latestId) return;

    if (!initializedRef.current) {
      initializedRef.current = true;
      lastIdRef.current = latestId;
      return;
    }

    if (latestId !== lastIdRef.current) {
      lastIdRef.current = latestId;
      if (!latestIsRead) {
        toast(latestMessage);
      }
    }
  }, [hasLatest, latestId, latestIsRead, latestMessage]);

  return null;
}
