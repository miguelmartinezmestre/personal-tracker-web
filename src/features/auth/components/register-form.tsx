'use client';

import { AlertCircle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Form } from '@/components/ui/form-tanstack';
import { createRegisterSchema, type RegisterFormValues } from '@/features/auth/schemas/register';
import { useForm } from '@tanstack/react-form';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { authClient } from '@/features/auth/client';
import { useSignOutMutationOptions } from '@/features/auth/client';
import { useMutation } from '@tanstack/react-query';
import { useSession } from '@/features/auth/hooks/use-session';
import { getErrorMessage } from '@/lib/error-utils';
import { getInvitationCallbackPath } from '@shared/auth-security';
import { RegisterFormInputField } from './register-form-input-field';

interface RegisterFormProps {
    invitationToken?: string | null;
}

export default function RegisterForm({ invitationToken }: RegisterFormProps) {
    const router = useRouter();
    const t = useTranslations('HomePage');
    const tCommon = useTranslations('Common');
    const registerSchema = createRegisterSchema({
        weakPassword: t('errors.weakPassword'),
        passwordsDontMatch: t('errors.passwordsDontMatch'),
    });
    const [registerError, setRegisterError] = useState('');
    const [verificationSent, setVerificationSent] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const session = useSession();

    const signOutMutation = useMutation(
        useSignOutMutationOptions({
            onSuccess: () => {},
            onError: () => {},
        })
    );

    const form = useForm({
        defaultValues: {
            email: '',
            password: '',
            confirmPassword: '',
            username: '',
        } as RegisterFormValues,
        validators: {
            onChange: registerSchema,
            onSubmit: registerSchema,
        },
        onSubmit: async ({ value }: { value: RegisterFormValues }) => {
            await onSubmit(value);
        },
    });

    async function onSubmit(values: RegisterFormValues) {
        setRegisterError('');
        setVerificationSent(false);
        setIsSubmitting(true);

        const hasExistingSession = Boolean(session.data?.user);

        try {
            if (hasExistingSession) {
                await signOutMutation.mutateAsync();
            }

            await authClient.signUp.email(
                {
                    name: values.username,
                    email: values.email,
                    password: values.password,
                    callbackURL: invitationToken
                        ? getInvitationCallbackPath(invitationToken)
                        : undefined,
                },
                {
                    onSuccess: async () => {
                        try {
                            if (invitationToken) {
                                const verificationResult = await authClient.sendVerificationEmail({
                                    email: values.email,
                                    callbackURL: getInvitationCallbackPath(invitationToken),
                                });
                                if (verificationResult.error) {
                                    throw new Error(verificationResult.error.message);
                                }

                                setVerificationSent(true);
                                setIsSubmitting(false);
                                return;
                            }

                            router.push('/dashboard/home');
                        } catch (error: unknown) {
                            setRegisterError(getErrorMessage(error, t('errors.registerFallback')));
                            setIsSubmitting(false);
                        }
                    },
                    onError: errorContext => {
                        setRegisterError(
                            errorContext.error.message || t('errors.registerFallback')
                        );
                        setIsSubmitting(false);
                    },
                }
            );
        } catch (error: unknown) {
            setRegisterError(getErrorMessage(error, t('errors.registerFallback')));
            setIsSubmitting(false);
        }
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
                {verificationSent && (
                    <Alert className="mb-6">
                        <AlertTitle>{t('verificationSentTitle')}</AlertTitle>
                        <AlertDescription>{t('verificationSentDescription')}</AlertDescription>
                    </Alert>
                )}

                <RegisterFormInputField
                    name="username"
                    label={tCommon('fields.username')}
                    placeholder={tCommon('placeholders.username')}
                    testId="register-username-input"
                />

                <RegisterFormInputField
                    name="email"
                    type="email"
                    label={tCommon('fields.email')}
                    placeholder={tCommon('placeholders.email')}
                    testId="register-email-input"
                />

                <RegisterFormInputField
                    name="password"
                    type="password"
                    label={tCommon('fields.password')}
                    placeholder={tCommon('placeholders.min8Chars')}
                    testId="register-password-input"
                />

                <RegisterFormInputField
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
                        <Link href="/login" prefetch={false}>
                            {t('alreadyHaveAccount')} {t('login')}
                        </Link>
                    </p>
                </div>
            </form>
        </Form>
    );
}
