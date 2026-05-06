'use client';

import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { loginSchema } from '@/features/auth/schemas/login';
import { z } from 'zod';
import { useForm } from '@tanstack/react-form';
import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { authClient } from '@/features/auth/auth-client';
import { useSignOutMutationOptions } from '@/features/auth/auth-client';
import { useMutation } from '@tanstack/react-query';
import { useSession } from '@/features/auth/hooks/use-session';
import { useFormSubmit } from '@/hooks/use-form-submit';

export default function LoginForm() {
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

    const form = useForm<z.infer<typeof loginSchema>>({
        defaultValues: {
            email: '',
            password: '',
        },
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

        await authClient.signIn.email(
            {
                email: values.email,
                password: values.password,
            },
            {
                onSuccess: () => {
                    router.push('/dashboard/home');
                },
                onError: ctx => {
                    setLoginError(ctx.error.message);
                },
            }
        );
    }

    const { submit: onSubmit, isSubmitting } = useFormSubmit(handleSignIn);

    return (
        <Form {...form}>
            <form
                action={() => {
                    form.handleSubmit();
                }}
                className="space-y-6"
            >
                {loginError && (
                    <Alert variant="destructive" className="mb-6">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>{tCommon('error')}</AlertTitle>
                        <AlertDescription>{loginError}</AlertDescription>
                    </Alert>
                )}

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
                                    data-testid="email-input"
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
                                    placeholder={tCommon('placeholders.password')}
                                    className="focus:ring-2 focus:ring-primary/20"
                                    data-testid="password-input"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

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
                    disabled={isSubmitting}
                    data-testid="login-button"
                >
                    {isSubmitting ? tCommon('loading') : t('login')}
                </Button>

                <div className="text-center mt-4">
                    <p className="text-sm text-gray-600">
                        <Link href="/register" prefetch={false}>
                            {t('noAccount')} {t('register')}
                        </Link>
                    </p>
                </div>
            </form>
        </Form>
    );
}
