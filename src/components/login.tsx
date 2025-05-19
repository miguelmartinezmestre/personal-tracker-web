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
} from './ui/form';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertCircle } from 'lucide-react';
import Header from './header';
import Footer from './footer';
import { formSchema } from '../schemas/login';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTRPC } from '@/trpc/client';

export default function Login() {
    const trpc = useTRPC();
    const login = useMutation(trpc.auth.login.mutationOptions());

    const [loginError] = useState('');

    // const { mutation, loginError } = useLoginMutation();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
        // mutation.mutate(values);
        login.mutate(values);
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
                                    <AlertDescription>
                                        No ha sido posible iniciar sesión
                                    </AlertDescription>
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
                                // disabled={mutation.isPending}
                                data-testid="login-button"
                            >
                                {/* {mutation.isPending ? 'Iniciando sesión...' : 'Iniciar Sesión'} */}
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
