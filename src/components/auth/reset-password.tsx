'use client';

import { AlertCircle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { z } from 'zod';
import { useForm } from '@tanstack/react-form';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { resetPasswordSchema } from '@/schemas/reset-password';
import { useSearchParams } from 'next/navigation';

export default function ResetPassword() {

    const [registerError] = useState('');

    const searchParams = useSearchParams();

    const resetPasswordKey = searchParams.get('key');

    const form = useForm<z.infer<typeof resetPasswordSchema>>({
        defaultValues: {
            password: '',
            confirmPassword: '',
            resetPasswordKey: resetPasswordKey ?? '',
        },
        validators: {
            onChange: resetPasswordSchema,
            onSubmit: resetPasswordSchema,
        },
        onSubmit: async ({ value }: { value: z.infer<typeof resetPasswordSchema> }) => {
            await onSubmit(value);
        },
    });

    async function onSubmit(values: z.infer<typeof resetPasswordSchema>) {
        if (values.password !== values.confirmPassword) {
            return;
        }

        // const register = await resetPasswordAction(values);

        // if (register?.data?.error) {
        //     setRegisterError(register?.data?.message);
        // }
    }

    return (
        <Form {...form}>
            <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }} className="space-y-6">
                {registerError && (
                    <Alert variant="destructive" className="mb-6">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{registerError}</AlertDescription>
                    </Alert>
                )}

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
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button
                    type="submit"
                    className="w-full py-6 text-lg font-medium"
                // disabled={register.isPending}
                >
                    {/* {register.isPending ? 'Registrando...' : 'Registrarse'} */}
                    Registrarse
                </Button>

                <div className="text-center mt-4">
                    <p className="text-sm text-gray-600">
                        <Link href="/login" prefetch={false} >¿Ya tienes una cuenta? Iniciar sesión</Link>
                    </p>
                </div>
            </form>
        </Form>
    );
}
