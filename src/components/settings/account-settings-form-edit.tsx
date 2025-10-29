'use client';

import { useEffect, useState } from 'react';
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
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useMutation, useQuery } from '@tanstack/react-query';
import { accountDetailsSchema } from '@/schemas/account-details';
import { DialogFooter } from '@/components/ui/dialog';
import { useTranslations } from 'next-intl';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { api } from '../../../convex/_generated/api';

export default function AccountSettingsForm() {
    const t = useTranslations('Settings');
    const accountDetails = useQuery(convexQuery(api.users.getAccountDetails, {}));
    const updateAccountDetails = useMutation({ mutationFn: useConvexMutation(api.users.updateAccountDetails) });
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
        const updateData = {
            email: values.email,
            username: values.username,
        };

        console.log(updateData);

        const result = await updateAccountDetails.mutateAsync(updateData);

        if (result.error) {
            setError(result.message);
        } else {
            setMessage(result.message);
            form.reset({
                email: values.email,
                username: values.username,
            });
        }

        // Convex react-query client handles cache; explicit invalidation not required here.

        setOpen(false);
        form.reset();
    };

    useEffect(() => {
        if (accountDetails.data) {
            form.reset({
                email: accountDetails.data.email,
                username: accountDetails.data.username,
            });
        }
    }, [accountDetails.data, form]);

    if (accountDetails.isLoading) {
        return (
            <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <Form {...form}>
            <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }} className="space-y-5 py-4">
                <FormField
                    name="username"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('username')}</FormLabel>
                            <FormControl>
                                <Input placeholder="Enter username" {...field} />
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
                                <Input placeholder="Enter email" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <DialogFooter className="pt-4">
                    <Button variant="outline" type="button" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button type="submit">{t('saveAccount')}</Button>
                </DialogFooter>
                {error && <p className="text-red-500">{error}</p>}
                {message && <p className="text-green-500">{message}</p>}
            </form>
        </Form>
    );
}
