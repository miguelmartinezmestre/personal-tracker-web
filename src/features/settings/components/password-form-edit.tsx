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
} from '@/components/ui/form-tanstack';
import { Input } from '@/components/ui/input';
import { updatePasswordSchema } from '@/features/settings/schemas/update-password';
import { DialogFooter } from '@/components/ui/dialog';
import { useTranslations } from 'next-intl';
import { authClient } from '@/features/auth/client';
import { toast } from 'sonner';
import { getMessageOrFallback, getErrorMessage } from '@/lib/error-utils';

export default function PasswordFormEdit() {
    const t = useTranslations('Settings');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const form = useForm({
        defaultValues: {
            password: '',
            confirmPassword: '',
            newPassword: '',
        } as z.infer<typeof updatePasswordSchema>,
        validators: {
            onChange: updatePasswordSchema,
            onSubmit: updatePasswordSchema,
        },
        onSubmit: async ({ value }: { value: z.infer<typeof updatePasswordSchema> }) => {
            await onSubmit(value);
        },
    });

    const onSubmit = async (values: z.infer<typeof updatePasswordSchema>) => {
        if (values.password !== values.confirmPassword) {
            setError(t('passwordMismatch'));
            return;
        }

        if (values.password === values.newPassword) {
            setError(t('passwordSameAsOld'));
            return;
        }

        setIsLoading(true);
        setError('');
        setMessage('');

        const fallbackMsg = t('passwordUpdateFailed');

        try {
            const result = await authClient.changePassword({
                currentPassword: values.password,
                newPassword: values.newPassword,
                revokeOtherSessions: false,
            });

            if (result.error) {
                const msg = getMessageOrFallback(result.error.message, fallbackMsg);
                setError(msg);
                toast.error(msg);
            } else {
                setMessage(t('passwordUpdated'));
                toast.success(t('passwordUpdated'));
                form.reset();
            }
        } catch (err) {
            const msg = getErrorMessage(err, fallbackMsg);
            setError(msg);
            toast.error(msg);
        }
        setIsLoading(false);
    };

    return (
        <Form {...form}>
            <form
                action={() => {
                    form.handleSubmit();
                }}
                className="space-y-5 py-4"
            >
                <FormField
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('password')}</FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    type="password"
                                    data-testid="password-current-input"
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
                            <FormLabel>{t('confirmPassword')}</FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    type="password"
                                    data-testid="password-confirm-input"
                                />
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
                                <Input
                                    {...field}
                                    type="password"
                                    data-testid="password-new-input"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <DialogFooter className="pt-4">
                    <Button
                        variant="outline"
                        type="button"
                        onClick={() => form.reset()}
                        disabled={isLoading}
                        data-testid="password-cancel-button"
                    >
                        {t('cancel')}
                    </Button>
                    <Button type="submit" disabled={isLoading} data-testid="password-save-button">
                        {isLoading ? t('saving') : t('savePassword')}
                    </Button>
                </DialogFooter>
                {error && (
                    <p className="text-red-500" data-testid="password-error-message">
                        {error}
                    </p>
                )}
                {message && (
                    <p className="text-green-500" data-testid="password-success-message">
                        {message}
                    </p>
                )}
            </form>
        </Form>
    );
}
