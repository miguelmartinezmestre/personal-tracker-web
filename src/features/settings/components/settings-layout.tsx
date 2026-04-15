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
        <div className="space-y-6" data-testid="settings-page">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
                <p className="text-muted-foreground">{t('description')}</p>
            </div>

            <Tabs defaultValue="account" className="space-y-4">
                <TabsList className="grid w-full max-w-lg grid-cols-4">
                    <TabsTrigger
                        value="account"
                        className="flex items-center gap-2"
                        data-testid="settings-tab-account"
                    >
                        <User className="h-4 w-4" />
                        {t('account')}
                    </TabsTrigger>
                    <TabsTrigger
                        value="notifications"
                        className="flex items-center gap-2"
                        data-testid="settings-tab-notifications"
                    >
                        <Bell className="h-4 w-4" />
                        {t('notifications')}
                    </TabsTrigger>
                    <TabsTrigger
                        value="password"
                        className="flex items-center gap-2"
                        data-testid="settings-tab-password"
                    >
                        <Key className="h-4 w-4" />
                        {t('password')}
                    </TabsTrigger>
                    <TabsTrigger
                        value="danger"
                        className="flex items-center gap-2"
                        data-testid="settings-tab-danger"
                    >
                        <AlertTriangle className="h-4 w-4" />
                        {t('dangerZone')}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="account">
                    <Card className="max-w-2xl">
                        <CardHeader>
                            <CardTitle>{t('accountSettings')}</CardTitle>
                            <CardDescription>{t('accountSettingsDescription')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <AccountSettingsFormEdit />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="notifications">
                    <NotificationPreferencesForm />
                </TabsContent>

                <TabsContent value="password">
                    <Card className="max-w-2xl">
                        <CardHeader>
                            <CardTitle>{t('passwordSettings')}</CardTitle>
                            <CardDescription>{t('passwordSettingsDescription')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <PasswordFormEdit />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="danger">
                    <Card className="max-w-2xl">
                        <CardHeader>
                            <CardTitle>{t('dangerZoneSettings')}</CardTitle>
                            <CardDescription>{t('dangerZoneSettingsDescription')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <AccountDeletionSection />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
