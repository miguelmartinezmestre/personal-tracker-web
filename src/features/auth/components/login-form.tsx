'use client';

import type { Route } from 'next';

import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { createLoginSchema, type LoginFormValues } from '@/features/auth/schemas/login';
import { useForm } from '@tanstack/react-form';
import { useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { authClient } from '@/features/auth/client';
import { useSignOutMutationOptions } from '@/features/auth/client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useFormSubmit } from '@/hooks/use-form-submit';
import { getSafeCallbackPath } from '@/convex/features/auth/redirects';
import { useHydrated } from '@/hooks/use-hydrated';
import { getFieldErrors } from '@/components/forms/form-utils';
import { api } from '@/convex/_generated/api';
import { convexQuery } from '@convex-dev/react-query';
import { resolveErrorMessage } from '@/lib/error-messages';

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
    const locale = useLocale() === 'es' ? 'es' : 'en';
    const t = useTranslations('HomePage');
    const tCommon = useTranslations('Common');

    const loginSchema = createLoginSchema({
        invalidEmail: tCommon('validation.invalidEmail'),
        shortPassword: tCommon('validation.minimumCharacters', { count: 8 }),
    });

    const [loginError, setLoginError] = useState('');
    const session = useQuery(convexQuery(api.organizations.getCurrentSession, {}));
    const signOutMutation = useMutation(useSignOutMutationOptions());

    const loginDefaultValues: LoginFormValues = {
        email: '',
        password: '',
    };

    const form = useForm({
        defaultValues: loginDefaultValues,
        validators: {
            onChange: loginSchema,
            onSubmit: loginSchema,
        },
        onSubmit: async ({ value }: { value: LoginFormValues }) => {
            await onSubmit(value);
        },
    });

    async function handleSignIn(values: LoginFormValues) {
        setLoginError('');

        try {
            if (session.data?.user) {
                await signOutMutation.mutateAsync();
            }

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
                        setLoginError(resolveErrorMessage(ctx.error, locale));
                    },
                }
            );
        } catch (error) {
            // A failed fetch rejects instead of reaching onError.
            setLoginError(resolveErrorMessage(error, locale));
        }
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
                    <CheckCircle2 className="h-4 w-4" />
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
                                disabled={!hydrated}
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
                                disabled={!hydrated}
                                type="password"
                                placeholder={tCommon('placeholders.password')}
                                aria-invalid={isInvalid}
                                className="focus:ring-2 focus:ring-primary/20"
                                data-testid="password-input"
                            />
                            {isInvalid && <FieldError errors={errors} />}
                        </Field>
                    );
                }}
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
