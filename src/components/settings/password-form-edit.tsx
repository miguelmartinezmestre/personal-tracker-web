'use client';

import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useTRPC } from '@/trpc/client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { updatePasswordSchema } from '@/schemas/update-password';
import { DialogFooter } from '@/components/ui/dialog';

export default function PasswordFormEdit() {
    const trpc = useTRPC();
    const updatePassword = useMutation(trpc.user.updatePassword.mutationOptions());
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const form = useForm<z.infer<typeof updatePasswordSchema>>({
        resolver: zodResolver(updatePasswordSchema),
        defaultValues: {
            password: '',
            confirmPassword: '',
            newPassword: '',
        },
    });

    const onSubmit = async (values: z.infer<typeof updatePasswordSchema>) => {

        if (values.password !== values.confirmPassword) {
            form.setError('confirmPassword', {
                type: 'manual',
                message: 'Las contraseñas no coinciden',
            });
            return;
        }

        const updateData = {
            password: values.password,
            newPassword: values.newPassword,
            confirmPassword: values.confirmPassword,
        };

        console.log(updateData);

        const result = await updatePassword.mutateAsync(updateData);

        if (result.error) {
            setError(result.message);
        } else {
            setMessage(result.message);
        }

        setOpen(false);
        form.reset();
        setError('');
        setMessage('');
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-4">
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                                <Input {...field} type="password"/>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                                <Input {...field} type="password"/>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="newPassword"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>New Password</FormLabel>
                            <FormControl>
                                <Input {...field} type="password"/>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <DialogFooter className="pt-4">
                    <Button variant="outline" type="button" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button type="submit">Save Objective</Button>
                </DialogFooter>
                {error && <p className="text-red-500">{error}</p>}
                {message && <p className="text-green-500">{message}</p>}
            </form>
        </Form>
    );
}
