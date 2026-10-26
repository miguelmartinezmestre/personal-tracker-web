'use client';

import { toast } from 'sonner';
import { useMutation, useQuery } from '@tanstack/react-query';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { QueryErrorFallback } from '@/components/ui/query-error-fallback';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { api } from '@/convex/_generated/api';

const NOTIFICATION_TYPES = ['deadline', 'progress', 'status', 'achievement'] as const;

export function NotificationPreferencesCard() {
    const t = useTranslations('Settings.notifications');
    const preferences = useQuery(convexQuery(api.notifications.getNotificationPreferences, {}));

    const update = useMutation({
        mutationFn: useConvexMutation(api.notifications.updateNotificationPreferences),
    });

    let content;

    if (preferences.isError) {
        content = <QueryErrorFallback onRetry={() => void preferences.refetch()} />;
    } else if (!preferences.data) {
        content = <Skeleton className="h-40" />;
    } else {
        const current = preferences.data;

        content = (
            <ul className="space-y-4">
                {NOTIFICATION_TYPES.map(type => (
                    <li key={type} className="flex items-center justify-between gap-4">
                        <div className="space-y-1">
                            <Label htmlFor={`notification-preference-${type}`}>
                                {t(`${type}.label`)}
                            </Label>
                            <p className="text-muted-foreground text-sm">
                                {t(`${type}.description`)}
                            </p>
                        </div>
                        <Switch
                            id={`notification-preference-${type}`}
                            checked={current[type]}
                            disabled={update.isPending}
                            onCheckedChange={checked =>
                                update.mutate(
                                    { ...current, [type]: checked },
                                    { onSuccess: () => toast.success(t('saved')) }
                                )
                            }
                            data-testid={`notification-preference-${type}`}
                        />
                    </li>
                ))}
            </ul>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('title')}</CardTitle>
                <CardDescription>{t('description')}</CardDescription>
            </CardHeader>
            <CardContent>{content}</CardContent>
        </Card>
    );
}
