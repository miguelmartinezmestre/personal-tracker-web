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

function extractOrgList(result: unknown): Array<{ id: string }> {
    const data = (result as { data?: Array<{ id: string }> })?.data;
    return data ?? [];
}

function extractErrorMessage(error: unknown, fallback = 'Error during registration'): string {
    if (error instanceof Error) return error.message;
    return fallback;
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

    const form = useForm<z.infer<typeof registerSchema>>({
        defaultValues: {
            email: '',
            password: '',
            confirmPassword: '',
            username: '',
        },
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
                            console.error('Error after registration:', error);
                            setRegisterError(extractErrorMessage(error));
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
            setRegisterError(extractErrorMessage(error, t('errors.registerFallback')));
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

                <FormField
                    name="username"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-gray-700">
                                {tCommon('fields.username')}
                            </FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    placeholder={tCommon('placeholders.username')}
                                    className="focus:ring-2 focus:ring-primary/20"
                                    data-testid="register-username-input"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

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
                                    data-testid="register-email-input"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

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
                                    data-testid="register-password-input"
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
                                    data-testid="register-confirm-password-input"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
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
