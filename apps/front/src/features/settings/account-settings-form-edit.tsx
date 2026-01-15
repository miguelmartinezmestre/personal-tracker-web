'use client';

import { useEffect, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@repo/ui/components/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@repo/ui/components/form-tanstack';
import { Input } from '@repo/ui/components/input';
import { accountDetailsSchema } from '@/features/settings/account-details';
import { DialogFooter } from '@repo/ui/components/dialog';
import { useTranslations } from 'next-intl';
import { authClient } from '@/features/auth/auth-client';

export default function AccountSettingsFormEdit() {
    const t = useTranslations('Settings');
    const tCommon = useTranslations('Common');
    const sessionQuery = authClient.useSession();
    const sessionUser = sessionQuery?.data?.user;
    const [, setOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const form = useForm<z.infer<typeof accountDetailsSchema>>({
        defaultValues: {
            email: '',
            username: '',
        },
        validators: {
            onChange: accountDetailsSchema,
            onSubmit: accountDetailsSchema,
        },
        onSubmit: async ({ value }: { value: z.infer<typeof accountDetailsSchema> }) => {
            await onSubmit(value);
        },
    });

    const onSubmit = async (values: z.infer<typeof accountDetailsSchema>) => {
        setError('');
        setMessage('');

        if (!sessionUser) {
            setError(tCommon('genericErrorDescription'));
            return;
        }

        const currentName = sessionUser.name ?? '';
        const currentEmail = sessionUser.email ?? '';

        // 1) Update profile name (immediate)
        if (values.username !== currentName) {
            const { error: updateError } = await authClient.updateUser({
                name: values.username,
            });
            if (updateError) {
                setError(updateError.message || tCommon('genericErrorDescription'));
                return;
            }
        }

        // 2) Change email (requires verification; not immediate)
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

        setOpen(false);
    };

    useEffect(() => {
        if (sessionUser) {
            form.reset({
                email: sessionUser.email ?? '',
                username: sessionUser.name ?? '',
            });
        }
    }, [sessionUser?.email, sessionUser?.name, form]);

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
                onSubmit={e => {
                    e.preventDefault();
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
                                <Input placeholder={t('placeholders.enterUsername')} {...field} />
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
                                <Input placeholder={t('placeholders.enterEmail')} {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <DialogFooter className="pt-4">
                    <Button variant="outline" type="button" onClick={() => setOpen(false)}>
                        {t('cancel')}
                    </Button>
                    <Button type="submit">{t('saveAccount')}</Button>
                </DialogFooter>
                {error && <p className="text-red-500">{error}</p>}
                {message && <p className="text-green-500">{message}</p>}
            </form>
        </Form>
    );
}
