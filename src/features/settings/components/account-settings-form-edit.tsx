'use client';

import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
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
import { accountDetailsSchema } from '@/features/settings/schemas/account-details';
import { DialogFooter } from '@/components/ui/dialog';
import { useTranslations } from 'next-intl';
import { authClient } from '@/features/auth/auth-client';
import { useSession } from '@/features/auth/hooks/use-session';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/convex/_generated/api';
import { useFormSubmit } from '@/hooks/use-form-submit';

export default function AccountSettingsFormEdit() {
    const t = useTranslations('Settings');
    const tCommon = useTranslations('Common');
    const queryClient = useQueryClient();
    const sessionQuery = useSession();
    const sessionUser = sessionQuery?.data?.user;
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const accountDefaultValues = {
        email: sessionUser?.email ?? '',
        username: sessionUser?.name ?? '',
    } as z.infer<typeof accountDetailsSchema>;

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

        const currentName = sessionUser.name ?? '';
        const currentEmail = sessionUser.email ?? '';

        if (values.username !== currentName) {
            const { error: updateError } = await authClient.updateUser({
                name: values.username,
            });
            if (updateError) {
                setError(updateError.message || tCommon('genericErrorDescription'));
                return;
            }

            await queryClient.refetchQueries({
                queryKey: ['convex', { api: api.organizations.getCurrentSession }],
            });
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

    if (sessionQuery?.isPending) {
        return (
            <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <Form {...form}>
            <form
                action={() => {
                    form.handleSubmit();
                }}
                className="space-y-5 py-4"
            >
                <FormField
                    name="username"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('username')}</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder={t('placeholders.enterUsername')}
                                    {...field}
                                    data-testid="account-username-input"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('email')}</FormLabel>
                            <FormControl>
                                <Input
                                    type="email"
                                    placeholder={t('placeholders.enterEmail')}
                                    {...field}
                                    data-testid="account-email-input"
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
                    <p className="text-red-500" data-testid="account-error-message">
                        {error}
                    </p>
                )}
                {message && (
                    <p className="text-green-500" data-testid="account-success-message">
                        {message}
                    </p>
                )}
            </form>
        </Form>
    );
}
