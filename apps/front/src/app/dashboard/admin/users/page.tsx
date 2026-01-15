import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@repo/ui/components/card';
import { UsersTable } from '@/features/admin/users-table';
import { useTranslations } from 'next-intl';

export default function AdminUsersPage() {
    const t = useTranslations('Admin');

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight" role="heading" aria-level={1}>
                    {t('userManagement')}
                </h1>
                <p className="text-muted-foreground">{t('userManagementDescription')}</p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>{t('userManagement')}</CardTitle>
                    <CardDescription>{t('userManagementDescription')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <UsersTable data-tour="admin-users-table" />
                </CardContent>
            </Card>
        </div>
    );
}
