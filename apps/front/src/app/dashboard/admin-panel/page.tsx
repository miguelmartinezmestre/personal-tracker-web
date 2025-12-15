'use client';

import { useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/ui/components/tabs';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@repo/ui/components/card';
import { UsersTable } from '@/components/admin/users-table';
import { UserSessions } from '@/components/admin/user-sessions';
import { AuditLogs } from '@/components/admin/audit-logs';
import { useTranslations } from 'next-intl';
import { Users, FileText, Activity } from 'lucide-react';

const allowedTabs = new Set(['users', 'sessions', 'audit']);

export default function AdminPage() {
    const t = useTranslations('Admin');
    const searchParams = useSearchParams();

    const tabParam = searchParams.get('tab');
    const defaultTab = tabParam && allowedTabs.has(tabParam) ? tabParam : 'users';

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight" role="heading" aria-level={1}>
                    {t('title')}
                </h1>
                <p className="text-muted-foreground">{t('description')}</p>
            </div>

            <Tabs defaultValue={defaultTab} className="space-y-4" key={defaultTab}>
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="users" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {t('users')}
                    </TabsTrigger>
                    <TabsTrigger value="sessions" className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        {t('sessions')}
                    </TabsTrigger>
                    <TabsTrigger value="audit" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {t('auditLogs')}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="users">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('userManagement')}</CardTitle>
                            <CardDescription>{t('userManagementDescription')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <UsersTable />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="sessions">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('sessionManagement')}</CardTitle>
                            <CardDescription>{t('sessionManagementDescription')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <UserSessions />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="audit">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('auditLogManagement')}</CardTitle>
                            <CardDescription>{t('auditLogManagementDescription')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <AuditLogs />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
