/* eslint-disable @typescript-eslint/no-misused-promises */
import { createFileRoute, Link } from '@tanstack/react-router';
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
} from '../components/ui/form';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { AlertCircle } from 'lucide-react';
import Header from '../components/header';
import Footer from '../components/footer';
import { formSchema } from '../schemas/register';
import { useRegisterMutation } from '../services/mutations/user';
export const Route = createFileRoute('/register')({
    component: RouteComponent,
});

function RouteComponent() {
    const { mutation, registerError } = useRegisterMutation();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: '',
            password: '',
            confirmPassword: '',
            username: '',
        },
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
        if (values.password !== values.confirmPassword) {
            form.setError('confirmPassword', {
                type: 'manual',
                message: 'Las contraseñas no coinciden',
            });
            return;
        }

        mutation.mutate(values);
    }

    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            <Header />
            <div className="flex-grow flex items-center justify-center p-6">
                <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 border border-gray-100">
                    <h1 className="text-2xl font-bold text-center mb-6 text-primary">
                        Crear una Cuenta
                    </h1>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            {registerError && (
                                <Alert variant="destructive" className="mb-6">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Error</AlertTitle>
                                    <AlertDescription>{registerError}</AlertDescription>
                                </Alert>
                            )}

                            <FormField
                                control={form.control}
                                name="username"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-gray-700">
                                            Nombre de Usuario
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                placeholder="username"
                                                className="focus:ring-2 focus:ring-primary/20"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-gray-700">
                                            Correo Electrónico
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                type="email"
                                                placeholder="email@domain.com"
                                                className="focus:ring-2 focus:ring-primary/20"
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
                                        <FormLabel className="text-gray-700">Contraseña</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                type="password"
                                                placeholder="Mínimo 8 caracteres"
                                                className="focus:ring-2 focus:ring-primary/20"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-gray-700">
                                            Confirmar Contraseña
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                type="password"
                                                placeholder="Confirmar contraseña"
                                                className="focus:ring-2 focus:ring-primary/20"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Button
                                type="submit"
                                className="w-full py-6 text-lg font-medium"
                                disabled={mutation.isPending}
                            >
                                {mutation.isPending ? 'Registrando...' : 'Registrarse'}
                            </Button>

                            <div className="text-center mt-4">
                                <p className="text-sm text-gray-600">
                                    <Link to="/login">¿Ya tienes una cuenta? Iniciar sesión</Link>
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
