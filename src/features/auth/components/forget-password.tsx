'use client';

import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
    FieldShell,
    getFieldError,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
} from '@/components/ui/form-fields';
import { Input } from '@/components/ui/input';
import type { z } from 'zod';
import { useForm } from '@tanstack/react-form';
import { useState } from 'react';
import { forgetPasswordSchema } from '@/features/auth/schemas/forget-password';
import { authClient } from '@/features/auth/client';
import { useFormSubmit } from '@/hooks/use-form-submit';
import { useHydrated } from '@/hooks/use-hydrated';

export default function ForgetPasswordForm() {
    const hydrated = useHydrated();
    const tCommon = useTranslations('Common');
    const t = useTranslations('ForgotPassword');

    const [loginError, setLoginError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const forgetPasswordDefaultValues: z.infer<typeof forgetPasswordSchema> = {
        email: '',
    };

    const form = useForm({
        defaultValues: forgetPasswordDefaultValues,
        validators: {
            onChange: forgetPasswordSchema,
            onSubmit: forgetPasswordSchema,
        },
        onSubmit: async ({ value }: { value: z.infer<typeof forgetPasswordSchema> }) => {
            await onSubmit(value);
        },
    });

    async function handleRequestReset(values: z.infer<typeof forgetPasswordSchema>) {
        setLoginError('');
        setSuccessMessage('');

        const redirectTo = `${window.location.origin}/reset-password`;
        const { error } = await authClient.requestPasswordReset({
            email: values.email,
            redirectTo,
        });

        if (error) {
            setLoginError(error.message || tCommon('genericErrorDescription'));
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
                    {field => (
                        <FieldShell error={getFieldError(form, field)}>
                            <FormItem>
                                <FormLabel className="text-foreground">
                                    {tCommon('fields.email')}
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        name={field.name}
                                        value={field.state.value}
                                        onChange={event => field.handleChange(event.target.value)}
                                        onBlur={field.handleBlur}
                                        type="email"
                                        placeholder={tCommon('placeholders.email')}
                                        className="focus:ring-2 focus:ring-primary/20"
                                        data-testid="email-input"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        </FieldShell>
                    )}
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
