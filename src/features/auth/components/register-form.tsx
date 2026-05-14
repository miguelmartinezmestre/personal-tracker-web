'use client';

import { AlertCircle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Form } from '@/components/ui/form-tanstack';
import { registerSchema } from '@/features/auth/schemas/register';
import { z } from 'zod';
import { useForm } from '@tanstack/react-form';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { authClient } from '@/features/auth/auth-client';
import { useSignOutMutationOptions } from '@/features/auth/auth-client';
import { useMutation } from '@tanstack/react-query';
import { useSession } from '@/features/auth/hooks/use-session';
import { getErrorMessage } from '@/lib/error-utils';
import { RegisterFormInputField } from './register-form-input-field';

interface OrganizationListResponse {
    data?: Array<{ id: string }>;
}

function extractOrgList(result: unknown): Array<{ id: string }> {
    if (result === null || typeof result !== 'object') {
        return [];
    }
    const data = (result as OrganizationListResponse).data;
    if (!Array.isArray(data)) {
        return [];
    }
    return data.filter(
        (org): org is { id: string } =>
            typeof org === 'object' && org !== null && 'id' in org && typeof org.id === 'string'
    );
}

interface RegisterFormProps {
    invitationToken?: string | null;
}

export default function RegisterForm({ invitationToken }: RegisterFormProps) {
    const router = useRouter();
    const t = useTranslations('HomePage');
    const tCommon = useTranslations('Common');
    const [registerError, setRegisterError] = useState('');
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
        } as z.infer<typeof registerSchema>,
        validators: {
            onChange: registerSchema,
            onSubmit: registerSchema,
        },
        onSubmit: async ({ value }: { value: z.infer<typeof registerSchema> }) => {
            await onSubmit(value);
        },
    });

    async function onSubmit(values: z.infer<typeof registerSchema>) {
        setRegisterError('');
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
                },
                {
                    onSuccess: async () => {
                        try {
                            if (invitationToken) {
                                await authClient.organization.acceptInvitation({
                                    invitationId: invitationToken,
                                });

                                const orgsResult = await authClient.organization.list();
                                const organizations = extractOrgList(orgsResult);

                                const firstOrg = organizations[0];
                                if (firstOrg) {
                                    await authClient.organization.setActive({
                                        organizationId: firstOrg.id,
                                    });
                                }
                            }

                            router.push('/dashboard/home');
                        } catch (error: unknown) {
                            setRegisterError(getErrorMessage(error, t('errors.registerFallback')));
                            setIsSubmitting(false);
                        }
                    },
                    onError: ctx => {
                        setRegisterError(ctx.error.message || t('errors.registerFallback'));
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
