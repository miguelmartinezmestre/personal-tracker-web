'use client';

import { AlertCircle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@repo/ui/components/alert';
import {
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
    Form,
} from '@repo/ui/components/form-tanstack';
import { Input } from '@repo/ui/components/input';
import { registerSchema } from '@/schemas/register';
import { z } from 'zod';
import { useForm } from '@tanstack/react-form';
import { useState } from 'react';
import { Button } from '@repo/ui/components/button';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

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
            organizationSlug: '',
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
        if (values.password !== values.confirmPassword) {
            setRegisterError(t('errors.passwordsDontMatch'));
            return;
        }

        setIsSubmitting(true);

        await authClient.signUp.email(
            {
                name: values.username,
                email: values.email,
                password: values.password,
            },
            {
                onSuccess: async () => {
                    try {
                        let invitedOrganizationId: string | null = null;

                        // 1. If coming from an invitation, accept it FIRST
                        if (invitationToken) {
                            try {
                                const acceptResult = await authClient.organization.acceptInvitation({
                                    invitationId: invitationToken,
                                });
                                // Check response structure for organizationId
                                if (acceptResult && typeof acceptResult === 'object') {
                                    if ('data' in acceptResult && acceptResult.data) {
                                        invitedOrganizationId = (acceptResult.data as any).organizationId || (acceptResult.data as any).id;
                                    } else if ('organizationId' in acceptResult) {
                                        invitedOrganizationId = (acceptResult as any).organizationId;
                                    } else if ('id' in acceptResult) {
                                        invitedOrganizationId = (acceptResult as any).id;
                                    }
                                }
                            } catch (inviteError: any) {
                                console.error('Error accepting invitation:', inviteError);
                                // Continue with registration
                            }
                        }

                        // 2. Create the user's own organization
                        const createOrgResult = await authClient.organization.create({
                            name: `${values.username}'s Organization`,
                            slug: values.organizationSlug,
                        });

                        const ownOrganizationId = (createOrgResult as any)?.data?.id || (createOrgResult as any)?.id;

                        // 3. Set active organization (invited org takes priority)
                        if (invitedOrganizationId) {
                            await authClient.organization.setActive({
                                organizationId: invitedOrganizationId,
                            });
                        } else if (ownOrganizationId) {
                            await authClient.organization.setActive({
                                organizationId: ownOrganizationId,
                            });
                        }

                        router.push('/dashboard/home');
                    } catch (error: any) {
                        console.error('Error after registration:', error);
                        router.push('/dashboard/home');
                    }
                },
                onError: ctx => {
                    setRegisterError(ctx.error.message || t('errors.registerFallback'));
                    setIsSubmitting(false);
                },
            }
        );
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
