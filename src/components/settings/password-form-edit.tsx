'use client';

import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { updatePasswordSchema } from '@/schemas/update-password';
import { DialogFooter } from '@/components/ui/dialog';
import { useTranslations } from 'next-intl';

export default function PasswordFormEdit() {
    const t = useTranslations('Settings');
    // TODO: Implement password update via Convex Auth if needed
    // const updatePassword = useMutation({ mutationFn: async () => ({ message: 'Not implemented', error: true }) });
    const [, setOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const form = useForm<z.infer<typeof updatePasswordSchema>>({
        defaultValues: {
            password: '',
            confirmPassword: '',
            newPassword: '',
        },
        validators: {
            onChange: updatePasswordSchema,
            onSubmit: updatePasswordSchema,
        },
        onSubmit: async ({ value }: { value: z.infer<typeof updatePasswordSchema> }) => {
            await onSubmit(value);
        },
    });

    const onSubmit = async (values: z.infer<typeof updatePasswordSchema>) => {

        if (values.password !== values.confirmPassword) return;

        const updateData = {
            password: values.password,
            newPassword: values.newPassword,
            confirmPassword: values.confirmPassword,
        };

        console.log(updateData);

        // const result = await updatePassword.mutateAsync(updateData);

        // if (result.error) {
        //     setError(result.message);
        // } else {
        //     setMessage(result.message);
        // }

        setOpen(false);
        form.reset();
        setError('');
        setMessage('');
    };

    return (
        <Form {...form}>
            <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }} className="space-y-5 py-4">
                <FormField
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('password')}</FormLabel>
                            <FormControl>
                                <Input {...field} type="password" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    name="confirmPassword"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('confirmPassword')}</FormLabel>
                            <FormControl>
                                <Input {...field} type="password" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    name="newPassword"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('newPassword')}</FormLabel>
                            <FormControl>
                                <Input {...field} type="password" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <DialogFooter className="pt-4">
                    <Button variant="outline" type="button" onClick={() => setOpen(false)}>
                        {t('cancel')}
                    </Button>
                    <Button type="submit">{t('savePassword')}</Button>
                </DialogFooter>
                {error && <p className="text-red-500">{error}</p>}
                {message && <p className="text-green-500">{message}</p>}
            </form>
        </Form>
    );
}
