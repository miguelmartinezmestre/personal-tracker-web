'use client';

import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';
import { Button } from '@repo/ui/components/button';
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
import { z } from 'zod';
import { useForm } from '@tanstack/react-form';
import { useState } from 'react';
import { forgetPasswordSchema } from '@/schemas/forget-password';

export default function ForgetPasswordForm() {
    const tCommon = useTranslations('Common');
    const t = useTranslations('ForgotPassword');

    const [loginError] = useState('');
    const [successMessage] = useState('');

    const form = useForm<z.infer<typeof forgetPasswordSchema>>({
        defaultValues: {
            email: '',
        },
        validators: {
            onChange: forgetPasswordSchema,
            onSubmit: forgetPasswordSchema,
        },
        onSubmit: async ({ value }: { value: z.infer<typeof forgetPasswordSchema> }) => {
            await onSubmit(value);
        },
    });

    async function onSubmit(_values: z.infer<typeof forgetPasswordSchema>) {
        // mutation.mutate(values);
        // const login = await forgetPasswordAction(values);
        // if (login?.data?.error) {
        //     setLoginError(login?.data?.message);
        // } else {
        //     setSuccessMessage('Email enviado correctamente');
        // }
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
                {loginError && (
                    <Alert variant="destructive" className="mb-6">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>{tCommon('error')}</AlertTitle>
                        <AlertDescription>{loginError}</AlertDescription>
                    </Alert>
                )}

                {successMessage && (
                    <Alert variant="default" className="mb-6">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>{tCommon('success')}</AlertTitle>
                        <AlertDescription>{successMessage}</AlertDescription>
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

                <Button type="submit" className="w-full py-6 text-lg font-medium">
                    {t('submit')}
                </Button>
            </form>
        </Form>
    );
}
