'use client';

import type { Route } from 'next';

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
import { loginSchema } from '@/features/auth/schemas/login';
import type { z } from 'zod';
import { useForm } from '@tanstack/react-form';
import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { authClient } from '@/features/auth/client';
import { useSignOutMutationOptions } from '@/features/auth/client';
import { useMutation } from '@tanstack/react-query';
import { useSession } from '@/features/auth/hooks/use-session';
import { useFormSubmit } from '@/hooks/use-form-submit';
import { getSafeCallbackPath } from '@shared/auth-security';
import { useHydrated } from '@/hooks/use-hydrated';
interface LoginFormProps {
    showPasswordResetSuccess?: boolean;
    callbackUrl?: string;
}
export default function LoginForm({
    showPasswordResetSuccess = false,
    callbackUrl,
}: LoginFormProps) {
    const hydrated = useHydrated();
    const router = useRouter();
    const t = useTranslations('HomePage');
    const tCommon = useTranslations('Common');
    const [loginError, setLoginError] = useState('');
    const session = useSession();
    const signOutMutation = useMutation(
        useSignOutMutationOptions({
            onSuccess: () => {},
            onError: () => {},
        })
    );
    const loginDefaultValues: z.infer<typeof loginSchema> = {
        email: '',
        password: '',
    };
    const form = useForm({
        defaultValues: loginDefaultValues,
        validators: {
            onChange: loginSchema,
            onSubmit: loginSchema,
        },
        onSubmit: async ({ value }: { value: z.infer<typeof loginSchema> }) => {
            await onSubmit(value);
        },
    });
    async function handleSignIn(values: z.infer<typeof loginSchema>) {
        if (session.data?.user) {
            await signOutMutation.mutateAsync();
        }
        setLoginError('');
        await authClient.signIn.email(
            {
                email: values.email,
                password: values.password,
            },
            {
                onSuccess: () => {
                    router.push(getSafeCallbackPath(callbackUrl) as Route);
                },
                onError: ctx => {
                    setLoginError(ctx.error.message);
                },
            }
        );
    }
    const { submit: onSubmit, isSubmitting } = useFormSubmit(handleSignIn);
    return (
        <form
            action={() => {
                void form.handleSubmit();
            }}
            className="space-y-6"
        >
            {showPasswordResetSuccess && (
                <Alert variant="default" className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{tCommon('success')}</AlertTitle>
                    <AlertDescription>{t('resetPasswordSuccess')}</AlertDescription>
                </Alert>
            )}

            {loginError && (
                <Alert variant="destructive" className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{tCommon('error')}</AlertTitle>
                    <AlertDescription>{loginError}</AlertDescription>
                </Alert>
            )}

            <form.Field name="email">
                {field => (
                    <FieldShell name={field.name} error={getFieldError(form, field)}>
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
                                    disabled={!hydrated}
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

            <form.Field name="password">
                {field => (
                    <FieldShell
                        name={field.name}
                        error={field.state.meta.isTouched ? field.state.meta.errors[0] : undefined}
                    >
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
                                    disabled={!hydrated}
                                    type="password"
                                    placeholder={tCommon('placeholders.password')}
                                    className="focus:ring-2 focus:ring-primary/20"
                                    data-testid="password-input"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    </FieldShell>
                )}
            </form.Field>

            <div className="flex justify-end">
                <Link
                    href="/forget-password"
                    className="text-sm text-primary hover:text-primary/80 transition-colors"
                >
                    {t('forgotPassword')}
                </Link>
            </div>

            <Button
                type="submit"
                className="w-full py-6 text-lg font-medium"
                disabled={!hydrated || isSubmitting}
                data-testid="login-button"
            >
                {isSubmitting ? tCommon('loading') : t('login')}
            </Button>

            <div className="text-center mt-4">
                <p className="text-sm text-muted-foreground">
                    <Link href="/register" prefetch={false}>
                        {t('noAccount')} {t('register')}
                    </Link>
                </p>
            </div>
        </form>
    );
}
