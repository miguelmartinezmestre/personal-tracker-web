'use client';

import { useTranslations } from 'next-intl';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useConvex } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Bell, Trophy, Clock, Users, Mail, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';

export default function NotificationPreferencesForm() {
    const t = useTranslations('Settings');
    const convex = useConvex();

    const { data: preferences, isPending: isLoading } = useQuery({
        queryKey: ['notificationPreferences'],
        queryFn: async () => {
            return await convex.query(api.notificationPreferences.getUserPreferences);
        },
    });

    const updateMutation = useMutation({
        mutationFn: async (updates: {
            achievementNotifications?: boolean;
            deadlineNotifications?: boolean;
            progressNotifications?: boolean;
            organizationNotifications?: boolean;
            emailDigestEnabled?: boolean;
        }) => {
            return await convex.mutation(api.notificationPreferences.updateUserPreferences, updates);
        },
        onSuccess: () => {
            toast.success(t('preferencesSaved') || 'Preferences saved', {
                description: t('preferencesSavedDescription') || 'Your notification preferences have been updated.',
            });
        },
        onError: () => {
            toast.error(t('preferencesError') || 'Error', {
                description: t('preferencesErrorDescription') || 'Failed to update preferences. Please try again.',
            });
        },
    });

    const handleToggle = (
        field:
            | 'achievementNotifications'
            | 'deadlineNotifications'
            | 'progressNotifications'
            | 'organizationNotifications'
            | 'emailDigestEnabled'
    ) => {
        if (!preferences) return;

        const currentValue = preferences[field] ?? true;
        updateMutation.mutate({
            [field]: !currentValue,
        });
    };

    if (isLoading) {
        return (
            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5" />
                        {t('notifications') || 'Notifications'}
                    </CardTitle>
                    <CardDescription>
                        {t('notificationsDescription') ||
                            'Manage how and when you receive notifications.'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="max-w-2xl">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    {t('notifications') || 'Notifications'}
                </CardTitle>
                <CardDescription>
                    {t('notificationsDescription') ||
                        'Manage how and when you receive notifications. You can disable any type of notification at any time.'}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-start justify-between space-x-4">
                    <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                            <Trophy className="h-4 w-4 text-yellow-500" />
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

                <div className="flex items-start justify-between space-x-4">
                    <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-blue-500" />
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

                <div className="flex items-start justify-between space-x-4">
                    <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-green-500" />
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

                <div className="flex items-start justify-between space-x-4">
                    <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-purple-500" />
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

                <div className="flex items-start justify-between space-x-4 opacity-60">
                    <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-500" />
                            <Label htmlFor="email-digest" className="font-medium">
                                {t('emailDigest') || 'Email Digest'}{' '}
                                <span className="ml-2 text-xs text-muted-foreground">
                                    ({t('comingSoon') || 'Coming Soon'})
                                </span>
                            </Label>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {t('emailDigestDescription') ||
                                'Receive a weekly summary of your achievements and progress via email.'}
                        </p>
                    </div>
                    <Switch
                        id="email-digest"
                        checked={preferences?.emailDigestEnabled ?? false}
                        disabled={true}
                        onCheckedChange={() => handleToggle('emailDigestEnabled')}
                    />
                </div>

                <div className="mt-6 border-t pt-4 text-xs text-muted-foreground">
                    <p>
                        {t('privacyNote') ||
                            'Privacy Note: All notifications are enabled by default to maintain backward compatibility. You can disable any notification type above at any time. Your achievement unlocks are always tracked regardless of notification settings.'}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
