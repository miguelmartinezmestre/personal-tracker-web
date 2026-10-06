'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslations } from 'next-intl';
import type { AdminAccount } from '../schemas/setup-schema';
import { createAdminAccountSchema } from '../schemas/setup-schema';
import { MAX_SETUP_SECRET_LENGTH, MIN_SETUP_SECRET_LENGTH } from '@/convex/env';

interface StepAdminAccountProps {
    data: AdminAccount;
    onChange: (data: Partial<AdminAccount>) => void;
}

export default function StepAdminAccount({ data, onChange }: StepAdminAccountProps) {
    const t = useTranslations('Setup');
    const tCommon = useTranslations('Common');

    const validation = createAdminAccountSchema({
        setupSecretInvalidLength: t('adminAccount.setupSecretInvalidLength', {
            min: MIN_SETUP_SECRET_LENGTH,
            max: MAX_SETUP_SECRET_LENGTH,
        }),
    }).safeParse(data);
    let fieldErrors: Record<string, string>;
    if (!validation.success) {
        fieldErrors = Object.fromEntries(
            validation.error.issues.map(issue => [issue.path.join('.'), issue.message])
        );
    } else {
        fieldErrors = {};
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold">{t('adminAccount.title')}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    {t('adminAccount.description')}
                </p>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="username">{tCommon('fields.username')}</Label>
                    <Input
                        id="username"
                        value={data.username}
                        onChange={e => onChange({ username: e.target.value })}
                        placeholder={tCommon('placeholders.username')}
                        data-testid="setup-username"
                    />
                    {data.username && fieldErrors['username'] && (
                        <p className="text-sm text-destructive">{fieldErrors['username']}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="email">{tCommon('fields.email')}</Label>
                    <Input
                        id="email"
                        type="email"
                        value={data.email}
                        onChange={e => onChange({ email: e.target.value })}
                        placeholder={tCommon('placeholders.email')}
                        data-testid="setup-email"
                    />
                    {data.email && fieldErrors['email'] && (
                        <p className="text-sm text-destructive">{fieldErrors['email']}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="password">{tCommon('fields.password')}</Label>
                    <Input
                        id="password"
                        type="password"
                        value={data.password}
                        onChange={e => onChange({ password: e.target.value })}
                        placeholder={tCommon('placeholders.min8Chars')}
                        data-testid="setup-password"
                    />
                    {data.password && fieldErrors['password'] && (
                        <p className="text-sm text-destructive">{fieldErrors['password']}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="confirmPassword">{tCommon('fields.confirmPassword')}</Label>
                    <Input
                        id="confirmPassword"
                        type="password"
                        value={data.confirmPassword}
                        onChange={e => onChange({ confirmPassword: e.target.value })}
                        placeholder={tCommon('placeholders.confirmPassword')}
                        data-testid="setup-confirm-password"
                    />
                    {data.confirmPassword && fieldErrors['confirmPassword'] && (
                        <p className="text-sm text-destructive">{fieldErrors['confirmPassword']}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="setupSecret">{t('adminAccount.setupSecretLabel')}</Label>
                    <Input
                        id="setupSecret"
                        type="password"
                        autoComplete="off"
                        value={data.setupSecret}
                        onChange={e => onChange({ setupSecret: e.target.value })}
                        placeholder={t('adminAccount.setupSecretPlaceholder')}
                        aria-describedby="setup-secret-hint"
                        data-testid="setup-secret"
                    />
                    <p id="setup-secret-hint" className="text-sm text-muted-foreground">
                        {t('adminAccount.setupSecretHint')}
                    </p>
                    {data.setupSecret && fieldErrors['setupSecret'] && (
                        <p className="text-sm text-destructive">{fieldErrors['setupSecret']}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
