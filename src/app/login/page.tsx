"use client"

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { loginSchema } from '@/schemas/login';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTRPC } from '@/trpc/client';
import { useRouter } from 'next/navigation';
import { loginAction } from '@/server/actions';

export default function Login() {

    const [loginError, setLoginError] = useState('');

    const form = useForm<z.infer<typeof loginSchema>>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: 'lily@example.com',
            password: 'lily@example.com',
        },
    });

    async function onSubmit(values: z.infer<typeof loginSchema>) {
        // mutation.mutate(values);
        const login = await loginAction(values);

        if (login?.data?.error) {
            setLoginError(login?.data?.message);
        }
    }

    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <div className="flex-grow flex items-center justify-center p-6">
                <div className="w-full max-w-md rounded-xl shadow-lg p-8 border">
                    <h1 className="text-2xl font-bold text-center mb-6 text-primary">
                        Iniciar Sesión
                    </h1>

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
                                    href="/reset-password"
                                    className="text-sm text-primary hover:text-primary/80 transition-colors"
                                >
                                    ¿Olvidaste tu contraseña?
                                </Link>
                            </div>

                            <Button
                                type="submit"
                                className="w-full py-6 text-lg font-medium"
                                disabled={false}
                                data-testid="login-button"
                            >
                                {/* {login.isPending ? 'Iniciando sesión...' : 'Iniciar Sesión'} */}
                                Iniciar Sesión
                            </Button>

                            <div className="text-center mt-4">
                                <p className="text-sm text-gray-600">
                                    <Link href="/register">¿No tienes una cuenta? Registrarse</Link>
                                </p>
                            </div>
                        </form>
                    </Form>
                </div>
            </div>
            <Footer />
        </div>
    );
}
