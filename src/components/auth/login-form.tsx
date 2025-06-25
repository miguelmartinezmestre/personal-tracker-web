'use client';

import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { loginSchema } from '@/schemas/login';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { loginAction } from '@/server/actions';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function LoginForm() {
    const t = useTranslations('HomePage');
    const [loginError, setLoginError] = useState('');

    const form = useForm<z.infer<typeof loginSchema>>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: 'lily@example.com',
            password: 'lily@example.com',
        },
    });

    async function onSubmit(values: z.infer<typeof loginSchema>) {
        const login = await loginAction(values);

        if (login?.data?.error) {
            setLoginError(login?.data?.message);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {loginError && (
                    <Alert variant="destructive" className="mb-6">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{loginError}</AlertDescription>
                    </Alert>
                )}

                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-gray-700">email</FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    type="email"
                                    placeholder="nombre@correo.com"
                                    className="focus:ring-2 focus:ring-primary/20"
                                    data-testid="email-input"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-gray-700">password</FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    type="password"
                                    placeholder="Ingresa tu contraseña"
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
                    disabled={false}
                    data-testid="login-button"
                >
                    {t('login')}
                </Button>

                <div className="text-center mt-4">
                    <p className="text-sm text-gray-600">
                        <Link href="/register" prefetch={false}>{t('noAccount')} {t('register')}</Link>
                    </p>
                </div>
            </form>
        </Form>
    );
}
