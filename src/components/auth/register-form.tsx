'use client';

import { AlertCircle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { registerSchema } from '@/schemas/register';
import { z } from 'zod';
import { useForm } from '@tanstack/react-form';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

export default function RegisterForm() {
    const router = useRouter();
    const t = useTranslations('HomePage');
    const [registerError, setRegisterError] = useState('');

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
        if (values.password !== values.confirmPassword) {
            setRegisterError('Las contraseñas no coinciden');
            return;
        }

        await authClient.signUp.email(
            {
                name: values.username,
                email: values.email,
                password: values.password,
            },
            {
                onSuccess: () => {
                    router.push("/dashboard/home");
                },
                onError: (ctx) => {
                    setRegisterError(ctx.error.message || 'Error al registrar usuario. Por favor, intenta de nuevo.');
                },
            }
        );
    }


    return (
        <Form {...form}>
            <form
                onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}
                className="space-y-6"
            >
                {registerError && (
                    <Alert variant="destructive" className="mb-6">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{registerError}</AlertDescription>
                    </Alert>
                )}

                <FormField
                    name="username"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-gray-700">Nombre de Usuario</FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    placeholder="username"
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
                            <FormLabel className="text-gray-700">Correo Electrónico</FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    type="email"
                                    placeholder="email@domain.com"
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
                            <FormLabel className="text-gray-700">Contraseña</FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    type="password"
                                    placeholder="Mínimo 8 caracteres"
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
                            <FormLabel className="text-gray-700">Confirmar Contraseña</FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    type="password"
                                    placeholder="Confirmar contraseña"
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
                >
                    {t('register')}
                </Button>

                <div className="text-center mt-4">
                    <p className="text-sm text-gray-600">
                        <Link href="/login" prefetch={false} >{t('alreadyHaveAccount')} {t('login')}</Link>
                    </p>
                </div>
            </form>
        </Form>
    );
}
