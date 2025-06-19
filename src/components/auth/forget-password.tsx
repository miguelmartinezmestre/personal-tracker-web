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
import { forgetPasswordAction } from '@/server/actions';
import { forgetPasswordSchema } from '@/schemas/forget-password';

export default function ForgetPasswordForm() {
    const [loginError, setLoginError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const form = useForm<z.infer<typeof forgetPasswordSchema>>({
        resolver: zodResolver(forgetPasswordSchema),
        defaultValues: {
            email: '',
        },
    });

    async function onSubmit(values: z.infer<typeof forgetPasswordSchema>) {
        console.log(values);
        // mutation.mutate(values);
        const login = await forgetPasswordAction(values);

        if (login?.data?.error) {
            setLoginError(login?.data?.message);
        }else{
            setSuccessMessage('Email enviado correctamente');
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

                {successMessage && (
                    <Alert variant="success" className="mb-6">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Success</AlertTitle>
                        <AlertDescription>{successMessage}</AlertDescription>
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

                <Button
                    type="submit"
                    className="w-full py-6 text-lg font-medium"
                >
                    Enviar
                </Button>
            </form>
        </Form>
    );
}
