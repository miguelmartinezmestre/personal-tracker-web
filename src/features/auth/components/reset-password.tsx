'use client';

import { AlertCircle } from 'lucide-react';
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
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { resetPasswordSchema } from '@/features/auth/schemas/reset-password';
import { authClient } from '@/features/auth/client';
import { useFormSubmit } from '@/hooks/use-form-submit';
import { useHydrated } from '@/hooks/use-hydrated';

interface ResetPasswordProps {
    resetPasswordKey?: string;
}

export default function ResetPassword({ resetPasswordKey }: ResetPasswordProps) {
    const hydrated = useHydrated();
    const router = useRouter();
    const t = useTranslations('HomePage');
    const tCommon = useTranslations('Common');

    const [registerError, setRegisterError] = useState('');

    const resetPasswordDefaultValues: z.infer<typeof resetPasswordSchema> = {
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
        onSubmit: async ({ value }: { value: z.infer<typeof resetPasswordSchema> }) => {
            await onSubmit(value);
        },
    });

    async function handleResetPassword(values: z.infer<typeof resetPasswordSchema>) {
        setRegisterError('');

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
                        <AlertDescription>{registerError}</AlertDescription>
                    </Alert>
                )}

                <form.Field name="password">
                    {field => (
                        <FieldShell error={getFieldError(form, field)}>
                            <FormItem>
                                <FormLabel className="text-foreground">
                                    {tCommon('fields.password')}
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        name={field.name}
                                        value={field.state.value}
                                        onChange={event => field.handleChange(event.target.value)}
                                        onBlur={field.handleBlur}
                                        type="password"
                                        placeholder={tCommon('placeholders.min8Chars')}
                                        className="focus:ring-2 focus:ring-primary/20"
                                        data-testid="reset-password-input"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        </FieldShell>
                    )}
                </form.Field>

                <form.Field name="confirmPassword">
                    {field => (
                        <FieldShell error={getFieldError(form, field)}>
                            <FormItem>
                                <FormLabel className="text-foreground">
                                    {tCommon('fields.confirmPassword')}
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        name={field.name}
                                        value={field.state.value}
                                        onChange={event => field.handleChange(event.target.value)}
                                        onBlur={field.handleBlur}
                                        type="password"
                                        placeholder={tCommon('placeholders.confirmPassword')}
                                        className="focus:ring-2 focus:ring-primary/20"
                                        data-testid="reset-password-confirm-input"
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
