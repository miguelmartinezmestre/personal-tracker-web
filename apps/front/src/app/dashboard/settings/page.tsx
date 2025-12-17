'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/ui/components/tabs';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@repo/ui/components/card';
import AccountSettingsFormEdit from '@/components/settings/account-settings-form-edit';
import PasswordFormEdit from '@/components/settings/password-form-edit';
import { useTranslations } from 'next-intl';
import { User, Key } from 'lucide-react';

export default function SettingsPage() {
    const t = useTranslations('Settings');

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
                <p className="text-muted-foreground">{t('description')}</p>
            </div>

            <Tabs defaultValue="account" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="account" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {t('account')}
                    </TabsTrigger>
                    <TabsTrigger value="password" className="flex items-center gap-2">
                        <Key className="h-4 w-4" />
                        {t('password')}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="account">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('accountSettings')}</CardTitle>
                            <CardDescription>{t('accountSettingsDescription')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <AccountSettingsFormEdit />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="password">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('passwordSettings')}</CardTitle>
                            <CardDescription>{t('passwordSettingsDescription')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <PasswordFormEdit />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
