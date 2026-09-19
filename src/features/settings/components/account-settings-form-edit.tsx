'use client';

import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import type { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    FieldShell,
    getFieldError,
    FormControl,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form-fields';
import { Input } from '@/components/ui/input';
import { accountDetailsSchema } from '@/features/settings/schemas/account-details';
import { DialogFooter } from '@/components/ui/dialog';
import { useTranslations } from 'next-intl';
import { authClient } from '@/features/auth/client';
import { useSession } from '@/features/auth/hooks/use-session';
import { useFormSubmit } from '@/hooks/use-form-submit';

export default function AccountSettingsFormEdit() {
    const t = useTranslations('Settings');
    const tCommon = useTranslations('Common');
    const sessionQuery = useSession();
    const sessionUser = sessionQuery.data?.user;
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const accountDefaultValues: z.infer<typeof accountDetailsSchema> = {
        email: sessionUser?.email ?? '',
        username: sessionUser?.name ?? '',
    };

    const form = useForm({
        defaultValues: accountDefaultValues,
        validators: {
            onChange: accountDetailsSchema,
            onSubmit: accountDetailsSchema,
        },
        onSubmit: async ({ value }: { value: z.infer<typeof accountDetailsSchema> }) => {
            await onSubmit(value);
        },
    });

    const handleUpdateAccount = async (values: z.infer<typeof accountDetailsSchema>) => {
        setError('');
        setMessage('');

        if (!sessionUser) {
            setError(tCommon('genericErrorDescription'));
            return;
        }

        const currentName = sessionUser.name;
        const currentEmail = sessionUser.email;

        if (values.username !== currentName) {
            const { error: updateError } = await authClient.updateUser({
                name: values.username,
            });
            if (updateError) {
                setError(updateError.message || tCommon('genericErrorDescription'));
                return;
            }
        }

        if (values.email !== currentEmail) {
            const { error: changeError } = await authClient.changeEmail({
                newEmail: values.email,
                callbackURL: '/dashboard/settings',
            });
            if (changeError) {
                setError(changeError.message || tCommon('genericErrorDescription'));
                return;
            }

            setMessage(t('emailChangeRequested'));
        } else {
            setMessage(t('accountUpdated'));
        }
    };

    const handleCancel = () => {
        form.reset();
        form.setFieldValue('email', accountDefaultValues.email);
        form.setFieldValue('username', accountDefaultValues.username);
        setError('');
        setMessage('');
    };

    const { submit: onSubmit, isSubmitting } = useFormSubmit(handleUpdateAccount);

    if (sessionQuery.isPending) {
        return (
            <div className="flex justify-center items-center py-8">
                <Loader2 className="size-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <form
            action={() => {
                void form.handleSubmit();
            }}
            className="space-y-5 py-4"
        >
            <form.Field name="username">
                {field => (
                    <FieldShell name={field.name} error={getFieldError(form, field)}>
                        <FormItem>
                            <FormLabel>{t('username')}</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder={t('placeholders.enterUsername')}
                                    name={field.name}
                                    value={field.state.value}
                                    onChange={event => field.handleChange(event.target.value)}
                                    onBlur={field.handleBlur}
                                    data-testid="account-username-input"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    </FieldShell>
                )}
            </form.Field>

            <form.Field name="email">
                {field => (
                    <FieldShell name={field.name} error={getFieldError(form, field)}>
                        <FormItem>
                            <FormLabel>{t('email')}</FormLabel>
                            <FormControl>
                                <Input
                                    type="email"
                                    placeholder={t('placeholders.enterEmail')}
                                    name={field.name}
                                    value={field.state.value}
                                    onChange={event => field.handleChange(event.target.value)}
                                    onBlur={field.handleBlur}
                                    data-testid="account-email-input"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    </FieldShell>
                )}
            </form.Field>

            <DialogFooter className="pt-4">
                <Button
                    variant="outline"
                    type="button"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                    data-testid="account-cancel-button"
                >
                    {t('cancel')}
                </Button>
                <Button type="submit" disabled={isSubmitting} data-testid="account-save-button">
                    {isSubmitting ? tCommon('loading') : t('saveAccount')}
                </Button>
            </DialogFooter>
            {error && (
                <p className="text-destructive" data-testid="account-error-message">
                    {error}
                </p>
            )}
            {message && (
                <p
                    className="text-emerald-700 dark:text-emerald-300"
                    data-testid="account-success-message"
                >
                    {message}
                </p>
            )}
        </form>
    );
}
