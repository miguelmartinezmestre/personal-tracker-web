'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AccountSettingsFormEdit from './account-settings-form-edit';
import PasswordFormEdit from './password-form-edit';
import AccountDeletionSection from './account-deletion-section';
import NotificationPreferencesForm from './notification-preferences-form';
import { useTranslations } from 'next-intl';
import { User, Key, AlertTriangle, Bell } from 'lucide-react';

export default function SettingsLayout() {
    const t = useTranslations('Settings');

    return (
        <div className="w-full min-w-0 space-y-6" data-testid="settings-page">
            <div className="min-w-0">
                <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
                <p className="text-muted-foreground">{t('description')}</p>
            </div>

            <Tabs
                defaultValue="account"
                className="grid w-full min-w-0 gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start"
            >
                <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-xl border bg-card p-2 shadow-sm sm:grid-cols-4 lg:sticky lg:top-20 lg:grid-cols-1">
                    <TabsTrigger
                        value="account"
                        className="h-auto justify-start gap-2 whitespace-normal rounded-lg p-3 text-left"
                        data-testid="settings-tab-account"
                    >
                        <User className="size-4" />
                        {t('account')}
                    </TabsTrigger>
                    <TabsTrigger
                        value="notifications"
                        className="h-auto justify-start gap-2 whitespace-normal rounded-lg p-3 text-left"
                        data-testid="settings-tab-notifications"
                    >
                        <Bell className="size-4" />
                        {t('notifications')}
                    </TabsTrigger>
                    <TabsTrigger
                        value="password"
                        className="h-auto justify-start gap-2 whitespace-normal rounded-lg p-3 text-left"
                        data-testid="settings-tab-password"
                    >
                        <Key className="size-4" />
                        {t('password')}
                    </TabsTrigger>
                    <TabsTrigger
                        value="danger"
                        className="h-auto justify-start gap-2 whitespace-normal rounded-lg p-3 text-left data-[state=active]:text-destructive [&_svg]:text-destructive"
                        data-testid="settings-tab-danger"
                    >
                        <AlertTriangle className="size-4" />
                        {t('dangerZone')}
                    </TabsTrigger>
                </TabsList>

                <div className="min-w-0">
                    <TabsContent value="account" className="mt-0">
                        <Card className="w-full">
                            <CardHeader className="border-b pb-6">
                                <CardTitle className="flex items-center gap-2 text-xl">
                                    <User className="size-5 text-primary" />
                                    {t('accountSettings')}
                                </CardTitle>
                                <CardDescription>{t('accountSettingsDescription')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <AccountSettingsFormEdit />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="notifications" className="mt-0">
                        <NotificationPreferencesForm />
                    </TabsContent>

                    <TabsContent value="password" className="mt-0">
                        <Card className="w-full">
                            <CardHeader className="border-b pb-6">
                                <CardTitle className="flex items-center gap-2 text-xl">
                                    <Key className="size-5 text-primary" />
                                    {t('passwordSettings')}
                                </CardTitle>
                                <CardDescription>
                                    {t('passwordSettingsDescription')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <PasswordFormEdit />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="danger" className="mt-0">
                        <Card className="w-full border-destructive/30">
                            <CardHeader className="border-b border-destructive/20 pb-6">
                                <CardTitle className="flex items-center gap-2 text-xl text-destructive">
                                    <AlertTriangle className="size-5" />
                                    {t('dangerZoneSettings')}
                                </CardTitle>
                                <CardDescription>
                                    {t('dangerZoneSettingsDescription')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <AccountDeletionSection />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
