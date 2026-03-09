'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslations } from 'next-intl';
import type { OrganizationConfig } from '../schemas/setup-schema';

interface StepOrganizationProps {
    data: OrganizationConfig;
    onChange: (data: Partial<OrganizationConfig>) => void;
}

export default function StepOrganization({ data, onChange }: StepOrganizationProps) {
    const t = useTranslations('Setup');

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold">{t('organization.title')}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    {t('organization.description')}
                </p>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="orgName">{t('organization.nameLabel')}</Label>
                    <Input
                        id="orgName"
                        value={data.name}
                        onChange={e => onChange({ name: e.target.value })}
                        placeholder={t('organization.namePlaceholder')}
                        data-testid="setup-org-name"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="orgLogo">{t('organization.logoLabel')}</Label>
                    <Input
                        id="orgLogo"
                        value={data.logo ?? ''}
                        onChange={e => onChange({ logo: e.target.value })}
                        placeholder={t('organization.logoPlaceholder')}
                        data-testid="setup-org-logo"
                    />
                    <p className="text-xs text-muted-foreground">{t('organization.logoHint')}</p>
                </div>
            </div>
        </div>
    );
}
