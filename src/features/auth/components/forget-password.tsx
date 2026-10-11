'use client';

import { useLocale, useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useForm } from '@tanstack/react-form';
import { useState } from 'react';
import {
    createForgetPasswordSchema,
    type ForgetPasswordFormValues,
} from '@/features/auth/schemas/forget-password';
import { authClient } from '@/features/auth/client';
import { useFormSubmit } from '@/hooks/use-form-submit';
import { useHydrated } from '@/hooks/use-hydrated';
import { getFieldErrors } from '@/components/forms/form-utils';
import { resolveErrorMessage } from '@/lib/error-messages';

export default function ForgetPasswordForm() {
    const hydrated = useHydrated();
    const locale = useLocale() === 'es' ? 'es' : 'en';
    const tCommon = useTranslations('Common');
    const t = useTranslations('ForgotPassword');
    const forgetPasswordSchema = createForgetPasswordSchema({
        invalidEmail: tCommon('validation.invalidEmail'),
    });

    const [loginError, setLoginError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const forgetPasswordDefaultValues: ForgetPasswordFormValues = {
        email: '',
    };

    const form = useForm({
        defaultValues: forgetPasswordDefaultValues,
        validators: {
            onChange: forgetPasswordSchema,
            onSubmit: forgetPasswordSchema,
        },
        onSubmit: async ({ value }: { value: ForgetPasswordFormValues }) => {
            await onSubmit(value);
        },
    });

    async function handleRequestReset(values: ForgetPasswordFormValues) {
        setLoginError('');
        setSuccessMessage('');

        const redirectTo = `${window.location.origin}/reset-password`;
        const { error } = await authClient.requestPasswordReset({
            email: values.email,
            redirectTo,
        });

        if (error) {
            setLoginError(resolveErrorMessage(error, locale, tCommon('genericErrorDescription')));
            return;
        }

        setSuccessMessage(t('successMessage'));
    }

    const { submit: onSubmit, isSubmitting } = useFormSubmit(handleRequestReset);

    return (
        <form
            action={() => {
                void form.handleSubmit();
            }}
        >
            <fieldset disabled={!hydrated} className="min-w-0 space-y-6">
                {loginError && (
                    <Alert variant="destructive" className="mb-6">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>{tCommon('error')}</AlertTitle>
                        <AlertDescription>{loginError}</AlertDescription>
                    </Alert>
                )}

                {successMessage && (
                    <Alert variant="default" className="mb-6">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>{tCommon('success')}</AlertTitle>
                        <AlertDescription>{successMessage}</AlertDescription>
                    </Alert>
                )}

                <form.Field name="email">
                    {field => {
                        const errors = getFieldErrors(form, field);
                        const isInvalid = !!errors.length;
                        return (
                            <Field data-invalid={isInvalid}>
                                <FieldLabel htmlFor={field.name} className="text-foreground">
                                    {tCommon('fields.email')}
                                </FieldLabel>
                                <Input
                                    id={field.name}
                                    name={field.name}
                                    value={field.state.value}
                                    onChange={event => field.handleChange(event.target.value)}
                                    onBlur={field.handleBlur}
                                    type="email"
                                    placeholder={tCommon('placeholders.email')}
                                    aria-invalid={isInvalid}
                                    className="focus:ring-2 focus:ring-primary/20"
                                    data-testid="email-input"
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
                    data-testid="forgot-password-submit"
                >
                    {isSubmitting ? tCommon('loading') : t('submit')}
                </Button>
            </fieldset>
        </form>
    );
}
