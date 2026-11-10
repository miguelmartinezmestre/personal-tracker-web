'use client';

import { AlertCircle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useForm } from '@tanstack/react-form';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import {
    createResetPasswordSchema,
    type ResetPasswordFormValues,
} from '@/features/auth/schemas/reset-password';
import { authClient } from '@/features/auth/client';
import { useFormSubmit } from '@/hooks/use-form-submit';
import { useHydrated } from '@/hooks/use-hydrated';
import { getFieldErrors } from '@/components/forms/form-utils';
import { extractErrorCode, resolveErrorMessage } from '@/lib/error-messages';

interface ResetPasswordProps {
    resetPasswordKey?: string;
}

export default function ResetPassword({ resetPasswordKey }: ResetPasswordProps) {
    const hydrated = useHydrated();
    const router = useRouter();
    const locale = useLocale() === 'es' ? 'es' : 'en';
    const t = useTranslations('HomePage');
    const tCommon = useTranslations('Common');

    const resetPasswordSchema = createResetPasswordSchema({
        weakPassword: t('errors.weakPassword'),
        passwordsDontMatch: t('errors.passwordsDontMatch'),
        shortPassword: tCommon('validation.minimumCharacters', { count: 8 }),
    });

    const [registerError, setRegisterError] = useState('');
    const [linkUnusable, setLinkUnusable] = useState(false);

    const resetPasswordDefaultValues: ResetPasswordFormValues = {
        password: '',
        confirmPassword: '',
        resetPasswordKey: resetPasswordKey || '',
    };

    const form = useForm({
        defaultValues: resetPasswordDefaultValues,
        validators: {
            onChange: resetPasswordSchema,
            onSubmit: resetPasswordSchema,
        },
        onSubmit: async ({ value }: { value: ResetPasswordFormValues }) => {
            await onSubmit(value);
        },
    });

    async function handleResetPassword(values: ResetPasswordFormValues) {
        setRegisterError('');

        if (values.password !== values.confirmPassword) {
            return;
        }

        const token = values.resetPasswordKey;

        // A failed fetch rejects instead of returning { error }.
        const { error } = await authClient
            .resetPassword({ newPassword: values.password, token })
            .catch((networkError: unknown) => ({ error: networkError }));

        if (error) {
            const code = extractErrorCode(error);
            setLinkUnusable(code === 'INVALID_TOKEN' || code === 'TOKEN_EXPIRED');
            setRegisterError(
                resolveErrorMessage(error, locale, tCommon('genericErrorDescription'))
            );

            return;
        }

        router.push('/login?passwordReset=success');
    }

    const { submit: onSubmit, isSubmitting } = useFormSubmit(handleResetPassword);

    return (
        <form
            action={() => {
                void form.handleSubmit();
            }}
        >
            <fieldset disabled={!hydrated} className="min-w-0 space-y-6">
                {registerError && (
                    <Alert variant="destructive" className="mb-6">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>{tCommon('error')}</AlertTitle>
                        <AlertDescription>
                            {registerError}{' '}
                            {linkUnusable && (
                                <Link
                                    href="/forget-password"
                                    prefetch={false}
                                    className="underline underline-offset-4"
                                    data-testid="reset-password-request-new-link"
                                >
                                    {t('requestNewResetLink')}
                                </Link>
                            )}
                        </AlertDescription>
                    </Alert>
                )}

                <form.Field name="password">
                    {field => {
                        const errors = getFieldErrors(form, field);
                        const isInvalid = !!errors.length;

                        return (
                            <Field data-invalid={isInvalid}>
                                <FieldLabel htmlFor={field.name} className="text-foreground">
                                    {tCommon('fields.password')}
                                </FieldLabel>
                                <Input
                                    id={field.name}
                                    name={field.name}
                                    value={field.state.value}
                                    onChange={event => field.handleChange(event.target.value)}
                                    onBlur={field.handleBlur}
                                    type="password"
                                    placeholder={tCommon('placeholders.min8Chars')}
                                    aria-invalid={isInvalid}
                                    className="focus:ring-2 focus:ring-primary/20"
                                    data-testid="reset-password-input"
                                />
                                {isInvalid && <FieldError errors={errors} />}
                            </Field>
                        );
                    }}
                </form.Field>

                <form.Field name="confirmPassword">
                    {field => {
                        const errors = getFieldErrors(form, field);
                        const isInvalid = !!errors.length;

                        return (
                            <Field data-invalid={isInvalid}>
                                <FieldLabel htmlFor={field.name} className="text-foreground">
                                    {tCommon('fields.confirmPassword')}
                                </FieldLabel>
                                <Input
                                    id={field.name}
                                    name={field.name}
                                    value={field.state.value}
                                    onChange={event => field.handleChange(event.target.value)}
                                    onBlur={field.handleBlur}
                                    type="password"
                                    placeholder={tCommon('placeholders.confirmPassword')}
                                    aria-invalid={isInvalid}
                                    className="focus:ring-2 focus:ring-primary/20"
                                    data-testid="reset-password-confirm-input"
                                />
                                {isInvalid && <FieldError errors={errors} />}
                            </Field>
                        );
                    }}
                </form.Field>

                <Button
                    type="submit"
                    className="w-full py-6 text-lg font-medium"
                    disabled={isSubmitting}
                    data-testid="reset-password-submit"
                >
                    {isSubmitting ? tCommon('loading') : t('resetPassword')}
                </Button>

                <div className="text-center mt-4">
                    <p className="text-sm text-muted-foreground">
                        <Link href="/login" prefetch={false}>
                            {t('alreadyHaveAccount')} {t('login')}
                        </Link>
                    </p>
                </div>
            </fieldset>
        </form>
    );
}
