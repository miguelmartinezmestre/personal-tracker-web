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
import { UserSessions } from '@/components/admin/user-sessions';
import { AuditLogs } from '@/components/admin/audit-logs';
import { useTranslations } from 'next-intl';
import { FileText, Activity } from 'lucide-react';

const allowedTabs = new Set(['sessions', 'audit']);

export default function AdminPage() {
    const t = useTranslations('Admin');
    const searchParams = useSearchParams();

    const tabParam = searchParams.get('tab');
    const defaultTab = tabParam && allowedTabs.has(tabParam) ? tabParam : 'sessions';

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight" role="heading" aria-level={1}>
                    {t('title')}
                </h1>
                <p className="text-muted-foreground">{t('description')}</p>
            </div>

            <Tabs defaultValue={defaultTab} className="space-y-4" key={defaultTab}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="sessions" className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        {t('sessions')}
                    </TabsTrigger>
                    <TabsTrigger value="audit" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {t('auditLogs')}
                    </TabsTrigger>
                </TabsList>

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
                            <AuditLogs data-tour="admin-audit-logs" />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
