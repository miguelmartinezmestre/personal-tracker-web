'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useTranslations } from 'next-intl';
import type { PlatformConfig } from '../schemas/setup-schema';

interface StepPlatformConfigProps {
    data: PlatformConfig;
    onChange: (data: Partial<PlatformConfig>) => void;
}

export default function StepPlatformConfig({ data, onChange }: StepPlatformConfigProps) {
    const t = useTranslations('Setup');

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold">{t('platformConfig.title')}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    {t('platformConfig.description')}
                </p>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="platformName">{t('platformConfig.nameLabel')}</Label>
                    <Input
                        id="platformName"
                        value={data.platformName}
                        onChange={e => onChange({ platformName: e.target.value })}
                        placeholder={t('platformConfig.namePlaceholder')}
                        data-testid="setup-platform-name"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="defaultLanguage">{t('platformConfig.languageLabel')}</Label>
                    <Select
                        value={data.defaultLanguage}
                        onValueChange={value => {
                            if (value === 'en' || value === 'es') {
                                onChange({ defaultLanguage: value });
                            }
                        }}
                    >
                        <SelectTrigger id="defaultLanguage" data-testid="setup-language-select">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="es">Español</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    );
}
