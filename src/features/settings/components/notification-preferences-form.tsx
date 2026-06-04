'use client';

import { useTranslations } from 'next-intl';
import { useMutation, useQuery } from '@tanstack/react-query';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Bell, Trophy, Clock, Users, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';

export default function NotificationPreferencesForm() {
    const t = useTranslations('Settings');
    const preferencesQuery = convexQuery(api.notificationPreferences.getUserPreferences, {});

    const { data: preferences, isPending: isLoading } = useQuery(preferencesQuery);

    const updateMutation = useMutation({
        mutationFn: useConvexMutation(api.notificationPreferences.updateUserPreferences),
        onSuccess: () => {
            toast.success(t('preferencesSaved') || 'Preferences saved', {
                description:
                    t('preferencesSavedDescription') ||
                    'Your notification preferences have been updated.',
            });
        },
        onError: () => {
            toast.error(t('preferencesError') || 'Error', {
                description:
                    t('preferencesErrorDescription') ||
                    'Failed to update preferences. Please try again.',
            });
        },
    });

    const handleToggle = (
        field:
            | 'achievementNotifications'
            | 'deadlineNotifications'
            | 'progressNotifications'
            | 'organizationNotifications'
    ) => {
        if (!preferences) return;

        const currentValue = preferences[field] ?? true;
        updateMutation.mutate({
            [field]: !currentValue,
        });
    };

    if (isLoading) {
        return (
            <Card className="w-full">
                <CardHeader className="border-b pb-6">
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="size-5 text-primary" />
                        {t('notifications') || 'Notifications'}
                    </CardTitle>
                    <CardDescription>
                        {t('notificationsDescription') ||
                            'Manage how and when you receive notifications.'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full">
            <CardHeader className="border-b pb-6">
                <CardTitle className="flex items-center gap-2 text-xl">
                    <Bell className="size-5 text-primary" />
                    {t('notifications') || 'Notifications'}
                </CardTitle>
                <CardDescription>
                    {t('notificationsDescription') ||
                        'Manage how and when you receive notifications. You can disable any type of notification at any time.'}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
                    <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                            <Trophy className="size-4 text-yellow-500" />
                            <Label htmlFor="achievement-notifications" className="font-medium">
                                {t('achievementNotifications') || 'Achievement Notifications'}
                            </Label>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {t('achievementNotificationsDescription') ||
                                'Receive notifications when you unlock achievements and earn points. (Gamification)'}
                        </p>
                    </div>
                    <Switch
                        id="achievement-notifications"
                        checked={preferences?.achievementNotifications ?? true}
                        onCheckedChange={() => handleToggle('achievementNotifications')}
                        disabled={updateMutation.isPending}
                    />
                </div>

                <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
                    <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                            <Clock className="size-4 text-blue-500" />
                            <Label htmlFor="deadline-notifications" className="font-medium">
                                {t('deadlineNotifications') || 'Deadline Reminders'}
                            </Label>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {t('deadlineNotificationsDescription') ||
                                'Get reminded when your objectives have upcoming deadlines.'}
                        </p>
                    </div>
                    <Switch
                        id="deadline-notifications"
                        checked={preferences?.deadlineNotifications ?? true}
                        onCheckedChange={() => handleToggle('deadlineNotifications')}
                        disabled={updateMutation.isPending}
                    />
                </div>

                <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
                    <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                            <Clock className="size-4 text-green-500" />
                            <Label htmlFor="progress-notifications" className="font-medium">
                                {t('progressNotifications') || 'Progress & Streak Alerts'}
                            </Label>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {t('progressNotificationsDescription') ||
                                'Receive notifications about your progress updates and streak milestones.'}
                        </p>
                    </div>
                    <Switch
                        id="progress-notifications"
                        checked={preferences?.progressNotifications ?? true}
                        onCheckedChange={() => handleToggle('progressNotifications')}
                        disabled={updateMutation.isPending}
                    />
                </div>

                <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
                    <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                            <Users className="size-4 text-purple-500" />
                            <Label htmlFor="organization-notifications" className="font-medium">
                                {t('organizationNotifications') || 'Organization Notifications'}
                            </Label>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {t('organizationNotificationsDescription') ||
                                'Receive notifications about organization-wide achievements and member activities.'}
                        </p>
                    </div>
                    <Switch
                        id="organization-notifications"
                        checked={preferences?.organizationNotifications ?? true}
                        onCheckedChange={() => handleToggle('organizationNotifications')}
                        disabled={updateMutation.isPending}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
