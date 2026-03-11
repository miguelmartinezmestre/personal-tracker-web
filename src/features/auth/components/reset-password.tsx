'use client';

import { AlertCircle } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { resetPasswordSchema } from '@/features/auth/schemas/reset-password';
import { authClient } from '@/features/auth/auth-client';

interface ResetPasswordProps {
    resetPasswordKey?: string;
}

export default function ResetPassword({ resetPasswordKey }: ResetPasswordProps) {
    const t = useTranslations('HomePage');
    const tCommon = useTranslations('Common');

    const [registerError, setRegisterError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const form = useForm<z.infer<typeof resetPasswordSchema>>({
        defaultValues: {
            password: '',
            confirmPassword: '',
            resetPasswordKey: resetPasswordKey || '',
        },
        validators: {
            onChange: resetPasswordSchema,
            onSubmit: resetPasswordSchema,
        },
        onSubmit: async ({ value }: { value: z.infer<typeof resetPasswordSchema> }) => {
            await onSubmit(value);
        },
    });

    async function onSubmit(values: z.infer<typeof resetPasswordSchema>) {
        setRegisterError('');
        setSuccessMessage('');

        if (values.password !== values.confirmPassword) {
            return;
        }

        const token = values.resetPasswordKey;
        const { error } = await authClient.resetPassword({
            newPassword: values.password,
            token,
        });

        if (error) {
            setRegisterError(error.message || tCommon('genericErrorDescription'));
            return;
        }

        setSuccessMessage(t('resetPasswordSuccess'));
    }

    return (
        <Form {...form}>
            <form
                action={() => {
                    form.handleSubmit();
                }}
                className="space-y-6"
            >
                {registerError && (
                    <Alert variant="destructive" className="mb-6">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>{tCommon('error')}</AlertTitle>
                        <AlertDescription>{registerError}</AlertDescription>
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
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-gray-700">
                                {tCommon('fields.password')}
                            </FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    type="password"
                                    placeholder={tCommon('placeholders.min8Chars')}
                                    className="focus:ring-2 focus:ring-primary/20"
                                    data-testid="reset-password-input"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    name="confirmPassword"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-gray-700">
                                {tCommon('fields.confirmPassword')}
                            </FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    type="password"
                                    placeholder={tCommon('placeholders.confirmPassword')}
                                    className="focus:ring-2 focus:ring-primary/20"
                                    data-testid="reset-password-confirm-input"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button
                    type="submit"
                    className="w-full py-6 text-lg font-medium"
                    data-testid="reset-password-submit"
                >
                    {t('resetPassword')}
                </Button>

                <div className="text-center mt-4">
                    <p className="text-sm text-gray-600">
                        <Link href="/login" prefetch={false}>
                            {t('alreadyHaveAccount')} {t('login')}
                        </Link>
                    </p>
                </div>
            </form>
        </Form>
    );
}
