import { createFileRoute, useNavigate } from '@tanstack/react-router';
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
import { formSchema } from '../schemas/login';
import { useLoginMutation } from '../services/mutations/user';

export const Route = createFileRoute('/login')({
    component: RouteComponent,
});

function RouteComponent() {
    const navigate = useNavigate();

    const { mutation, loginError } = useLoginMutation();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
        mutation.mutate(values);
    }

    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            <Header />
            <div className="flex-grow flex items-center justify-center p-6">
                <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 border border-gray-100">
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
                                        <FormLabel className="text-gray-700">
                                            Correo Electrónico
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                type="email"
                                                placeholder="nombre@correo.com"
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
                                                placeholder="Ingresa tu contraseña"
                                                className="focus:ring-2 focus:ring-primary/20"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="flex justify-end">
                                <a
                                    href="/reset-password"
                                    className="text-sm text-primary hover:text-primary/80 transition-colors"
                                    onClick={e => {
                                        e.preventDefault();
                                        navigate({ to: '/reset-password' });
                                    }}
                                >
                                    ¿Olvidaste tu contraseña?
                                </a>
                            </div>

                            <Button
                                type="submit"
                                className="w-full py-6 text-lg font-medium"
                                disabled={mutation.isPending}
                            >
                                {mutation.isPending ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                            </Button>

                            <div className="text-center mt-4">
                                <p className="text-sm text-gray-600">
                                    ¿No tienes una cuenta?{' '}
                                    <a
                                        href="/register"
                                        className="font-medium text-primary hover:text-primary/80 transition-colors"
                                        onClick={e => {
                                            e.preventDefault();
                                            navigate({ to: '/register' });
                                        }}
                                    >
                                        Registrarse
                                    </a>
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
