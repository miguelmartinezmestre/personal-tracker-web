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
import { useRouter, useSearchParams } from 'next/navigation';
import { authClient } from '@/features/auth/auth-client';

export default function RegisterForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const t = useTranslations('HomePage');
    const tCommon = useTranslations('Common');
    const [registerError, setRegisterError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Get invitation token from URL if coming from an invitation link
    const invitationToken = searchParams.get('invitation');

    const form = useForm<z.infer<typeof registerSchema>>({
        defaultValues: {
            email: '',
            password: '',
            confirmPassword: '',
            username: '',
            organizationSlug: invitationToken ? undefined : '',
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
        // Clear any previous error
        setRegisterError('');

        // Require organizationSlug if NOT coming from an invitation
        if (!invitationToken && !values.organizationSlug) {
            setRegisterError(tCommon('fields.organizationSlug') + ' is required');
            return;
        }

        setIsSubmitting(true);

        try {
            await authClient.signUp.email(
                {
                    name: values.username,
                    email: values.email,
                    password: values.password,
                },
                {
                    onSuccess: async () => {
                        try {
                            // If coming from an invitation, accept it and set as active
                            if (invitationToken) {
                                await authClient.organization.acceptInvitation({
                                    invitationId: invitationToken,
                                });

                                // Get all organizations to find the invited one and set it as active
                                const orgsResult = await authClient.organization.list();
                                const organizations =
                                    (orgsResult as { data?: Array<{ id: string }> })?.data ?? [];

                                // Set the first organization as active (the invited one)
                                const firstOrg = organizations[0];
                                if (firstOrg) {
                                    await authClient.organization.setActive({
                                        organizationId: firstOrg.id,
                                    });
                                }
                            } else {
                                // No invitation - create user's own organization
                                const createOrgResult = await authClient.organization.create({
                                    name: `${values.username}'s Organization`,
                                    slug: values.organizationSlug as string,
                                });

                                const createResult = createOrgResult as
                                    | { data?: { id: string }; id?: string }
                                    | undefined;
                                const ownOrganizationId =
                                    createResult?.data?.id ?? createResult?.id;

                                if (ownOrganizationId) {
                                    await authClient.organization.setActive({
                                        organizationId: ownOrganizationId,
                                    });
                                }
                            }

                            router.push('/dashboard/home');
                        } catch (error: unknown) {
                            console.error('Error after registration:', error);
                            setRegisterError(
                                error instanceof Error ? error.message : 'Error during registration'
                            );
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
            setRegisterError(error instanceof Error ? error.message : t('errors.registerFallback'));
            setIsSubmitting(false);
        }
    }

    return (
        <Form {...form}>
            <form
                onSubmit={e => {
                    e.preventDefault();
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

                {/* Only show organizationSlug field if NOT coming from an invitation */}
                {!invitationToken && (
                    <FormField
                        name="organizationSlug"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-gray-700">
                                    {tCommon('fields.organizationSlug')}
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        {...field}
                                        placeholder={tCommon('placeholders.organizationSlug')}
                                        className="focus:ring-2 focus:ring-primary/20"
                                        data-testid="register-organization-slug-input"
                                    />
                                </FormControl>
                                <FormMessage />
                                <p className="text-xs text-gray-500 mt-1">
                                    {tCommon('fields.organizationSlugHint')}
                                </p>
                            </FormItem>
                        )}
                    />
                )}

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
