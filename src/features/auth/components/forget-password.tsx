'use client';

import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
    Form,
} from '@/components/ui/form-tanstack';
import { Input } from '@/components/ui/input';
import { z } from 'zod';
import { useForm } from '@tanstack/react-form';
import { useState } from 'react';
import { forgetPasswordSchema } from '@/features/auth/schemas/forget-password';
import { authClient } from '@/features/auth/client';
import { useFormSubmit } from '@/hooks/use-form-submit';

export default function ForgetPasswordForm() {
    const tCommon = useTranslations('Common');
    const t = useTranslations('ForgotPassword');

    const [loginError, setLoginError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const form = useForm({
        defaultValues: {
            email: '',
        } as z.infer<typeof forgetPasswordSchema>,
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
        <Form {...form}>
            <form
                action={() => {
                    form.handleSubmit();
                }}
                className="space-y-6"
            >
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

                <FormField
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-gray-700">
                                {tCommon('fields.email')}
                            </FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    type="email"
                                    placeholder={tCommon('placeholders.email')}
                                    className="focus:ring-2 focus:ring-primary/20"
                                    data-testid="email-input"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button
                    type="submit"
                    className="w-full py-6 text-lg font-medium"
                    disabled={isSubmitting}
                    data-testid="forgot-password-submit"
                >
                    {isSubmitting ? tCommon('loading') : t('submit')}
                </Button>
            </form>
        </Form>
    );
}
