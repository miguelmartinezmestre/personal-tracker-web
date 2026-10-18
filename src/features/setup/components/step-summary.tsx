'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import type { SetupData } from '../hooks/use-setup-wizard';

interface StepSummaryProps {
    data: SetupData;
}

export default function StepSummary({ data }: StepSummaryProps) {
    const t = useTranslations('Setup');
    let registrationPolicyLabel: string;

    if (data.registration.policy === 'open') {
        registrationPolicyLabel = t('registrationPolicy.openLabel');
    } else {
        registrationPolicyLabel = t('registrationPolicy.invitationLabel');
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold">{t('summary.title')}</h2>
                <p className="text-sm text-muted-foreground mt-1">{t('summary.description')}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {t('steps.platform')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                        <p className="font-medium">{data.platform.platformName}</p>
                        <p className="text-sm text-muted-foreground">
                            {data.platform.defaultLanguage === 'en' ? 'English' : 'Español'}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {t('steps.admin')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                        <p className="font-medium">{data.admin.username}</p>
                        <p className="text-sm text-muted-foreground">{data.admin.email}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {t('steps.organization')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="font-medium">{data.organization.name}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {t('steps.registration')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Badge
                            variant={data.registration.policy === 'open' ? 'default' : 'secondary'}
                        >
                            {registrationPolicyLabel}
                        </Badge>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        {t('steps.categories')} ({data.categories.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-2">
                        {data.categories.map(category => (
                            <Badge
                                key={category.name}
                                variant="outline"
                                style={{ borderColor: category.color, color: category.color }}
                            >
                                {category.name}
                            </Badge>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
