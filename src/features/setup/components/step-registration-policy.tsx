'use client';

import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useTranslations } from 'next-intl';
import type { RegistrationPolicy } from '../schemas/setup-schema';

interface StepRegistrationPolicyProps {
    data: RegistrationPolicy;
    onChange: (data: Partial<RegistrationPolicy>) => void;
}

export default function StepRegistrationPolicy({ data, onChange }: StepRegistrationPolicyProps) {
    const t = useTranslations('Setup');

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold">{t('registrationPolicy.title')}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    {t('registrationPolicy.description')}
                </p>
            </div>

            <RadioGroup
                value={data.policy}
                onValueChange={value => {
                    if (value === 'open' || value === 'invitation-only') {
                        onChange({ policy: value });
                    }
                }}
                className="space-y-4"
                data-testid="setup-registration-policy"
            >
                <div className="flex items-start space-x-3 rounded-md border p-4">
                    <RadioGroupItem value="open" id="policy-open" className="mt-0.5" />
                    <div>
                        <Label htmlFor="policy-open" className="font-medium cursor-pointer">
                            {t('registrationPolicy.openLabel')}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            {t('registrationPolicy.openDescription')}
                        </p>
                    </div>
                </div>

                <div className="flex items-start space-x-3 rounded-md border p-4">
                    <RadioGroupItem value="invitation-only" id="policy-invite" className="mt-0.5" />
                    <div>
                        <Label htmlFor="policy-invite" className="font-medium cursor-pointer">
                            {t('registrationPolicy.invitationLabel')}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            {t('registrationPolicy.invitationDescription')}
                        </p>
                    </div>
                </div>
            </RadioGroup>
        </div>
    );
}
