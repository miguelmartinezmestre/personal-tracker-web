'use client';

import { AlertCircle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { createRegisterSchema, type RegisterFormValues } from '@/features/auth/schemas/register';
import { useForm } from '@tanstack/react-form';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { Route } from 'next';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { authClient } from '@/features/auth/client';
import { useSignOutMutationOptions } from '@/features/auth/client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { resolveErrorMessage } from '@/lib/error-messages';
import { getInvitationCallbackPath } from '@/convex/features/auth/redirects';
import { RegisterFormInputField } from './register-form-input-field';
import { useHydrated } from '@/hooks/use-hydrated';
import { api } from '@/convex/_generated/api';
import { convexQuery } from '@convex-dev/react-query';
import { PersonalCategoriesStep } from '@/features/categories/components/personal-categories-step';

interface RegisterFormProps {
    invitationToken?: string | null;
    invitationRequiresVerification?: boolean;
}

type RegistrationAttempt =
    { status: 'dashboard' } | { status: 'verification-sent' } | { status: 'error'; error: unknown };

async function registerAccount({
    values,
    invitationToken,
    invitationRequiresVerification,
    hasActiveSession,
    signOut,
}: {
    values: RegisterFormValues;
    invitationToken?: string | null;
    invitationRequiresVerification: boolean;
    hasActiveSession: boolean;
    signOut: () => Promise<void>;
}): Promise<RegistrationAttempt> {
    if (hasActiveSession) {
        await signOut();
    }

    const result = await authClient.signUp.email({
        name: values.username,
        email: values.email,
        password: values.password,
        callbackURL: invitationToken ? getInvitationCallbackPath(invitationToken) : undefined,
    });

    if (result.error) {
        return { status: 'error', error: result.error };
    }

    if (!invitationToken || !invitationRequiresVerification) {
        return { status: 'dashboard' };
    }

    const verification = await authClient.sendVerificationEmail({
        email: values.email,
        callbackURL: getInvitationCallbackPath(invitationToken),
    });

    if (verification.error) {
        return { status: 'error', error: verification.error };
    }

    return { status: 'verification-sent' };
}

export default function RegisterForm({
    invitationToken,
    invitationRequiresVerification = false,
}: RegisterFormProps) {
    const hydrated = useHydrated();
    const router = useRouter();
    const locale = useLocale() === 'es' ? 'es' : 'en';
    const t = useTranslations('HomePage');
    const tCommon = useTranslations('Common');

    const registerSchema = createRegisterSchema({
        weakPassword: t('errors.weakPassword'),
        passwordsDontMatch: t('errors.passwordsDontMatch'),
        invalidEmail: tCommon('validation.invalidEmail'),
        nameRequired: tCommon('validation.required'),
        shortPassword: tCommon('validation.minimumCharacters', { count: 8 }),
    });

    const [registerError, setRegisterError] = useState('');
    const [verificationSent, setVerificationSent] = useState(false);
    const [choosingCategories, setChoosingCategories] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const session = useQuery(convexQuery(api.organizations.getCurrentSession, {}));
    const signOutMutation = useMutation(useSignOutMutationOptions());

    const registerDefaultValues: RegisterFormValues = {
        email: '',
        password: '',
        confirmPassword: '',
        username: '',
    };

    const form = useForm({
        defaultValues: registerDefaultValues,
        validators: {
            onChange: registerSchema,
            onSubmit: registerSchema,
        },
        onSubmit: async ({ value }: { value: RegisterFormValues }) => {
            await onSubmit(value);
        },
    });

    const loginHref: Route = invitationToken
        ? `/login?${new URLSearchParams({ callbackUrl: getInvitationCallbackPath(invitationToken) }).toString()}`
        : '/login';

    async function onSubmit(values: RegisterFormValues) {
        setRegisterError('');
        setVerificationSent(false);
        setIsSubmitting(true);
        await registerAccount({
            values,
            invitationToken,
            invitationRequiresVerification,
            hasActiveSession: Boolean(session.data?.user),
            signOut: async () => {
                await signOutMutation.mutateAsync();
            },
        })
            .then(attempt => {
                if (attempt.status === 'error') {
                    setRegisterError(
                        resolveErrorMessage(attempt.error, locale, t('errors.registerFallback'))
                    );

                    return;
                }

                if (attempt.status === 'verification-sent') {
                    setVerificationSent(true);

                    return;
                }

                setChoosingCategories(true);
            })
            .catch(error => {
                setRegisterError(resolveErrorMessage(error, locale, t('errors.registerFallback')));
            })
            .finally(() => setIsSubmitting(false));
    }

    if (choosingCategories) {
        return <PersonalCategoriesStep onDone={() => router.push('/dashboard/home')} />;
    }

    if (verificationSent) {
        return (
            <Alert data-testid="register-verification-sent">
                <AlertTitle>{t('verificationSentTitle')}</AlertTitle>
                <AlertDescription>{t('verificationSentDescription')}</AlertDescription>
            </Alert>
        );
    }

    return (
        <form
            action={() => {
                void form.handleSubmit();
            }}
            className="space-y-6"
        >
            <fieldset disabled={!hydrated} className="space-y-6 min-w-0">
                {registerError && (
                    <Alert variant="destructive" className="mb-6">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>{tCommon('error')}</AlertTitle>
                        <AlertDescription>{registerError}</AlertDescription>
                    </Alert>
                )}

                <RegisterFormInputField
                    form={form}
                    name="username"
                    label={tCommon('fields.username')}
                    placeholder={tCommon('placeholders.username')}
                    testId="register-username-input"
                />

                <RegisterFormInputField
                    form={form}
                    name="email"
                    type="email"
                    label={tCommon('fields.email')}
                    placeholder={tCommon('placeholders.email')}
                    testId="register-email-input"
                />

                <RegisterFormInputField
                    form={form}
                    name="password"
                    type="password"
                    label={tCommon('fields.password')}
                    placeholder={tCommon('placeholders.min8Chars')}
                    testId="register-password-input"
                />

                <RegisterFormInputField
                    form={form}
                    name="confirmPassword"
                    type="password"
                    label={tCommon('fields.confirmPassword')}
                    placeholder={tCommon('placeholders.confirmPassword')}
                    testId="register-confirm-password-input"
                />

                <Button
                    type="submit"
                    className="w-full py-6 text-lg font-medium"
                    data-testid="register-button"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? tCommon('loading') : t('register')}
                </Button>

                <div className="text-center mt-4">
                    <p className="text-sm text-muted-foreground">
                        <Link href={loginHref} prefetch={false}>
                            {t('alreadyHaveAccount')} {t('login')}
                        </Link>
                    </p>
                </div>
            </fieldset>
        </form>
    );
}
