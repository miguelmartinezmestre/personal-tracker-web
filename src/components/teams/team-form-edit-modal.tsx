'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { PlusCircle } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import { useMutation } from '@tanstack/react-query';
import { Team, savedTeamSchema } from '@/schemas/team';
import { useTranslations } from 'next-intl';
import { useConvexMutation } from '@convex-dev/react-query';
import { api } from '../../../convex/_generated/api';


export default function EditTeamFormModal({ defaultValues }: { defaultValues: Team }) {
    const t = useTranslations('Teams');
    const updateTeam = useMutation({ mutationFn: useConvexMutation(api.teams.updateTeam) });
    const [open, setOpen] = useState(false);
    const form = useForm<z.infer<typeof savedTeamSchema>>({
        resolver: zodResolver(savedTeamSchema),
        defaultValues: defaultValues,
    });

    const onSubmit = async (values: Team) => {
        const updateData = {
            id: values.id as any,
            name: values.name,
            description: values.description ?? undefined,
        };

        console.log(updateData);

        await updateTeam.mutateAsync(updateData);

        setOpen(false);
        form.reset();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <PlusCircle className="h-4 w-4" />
                    {t('editTeam')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t('editTeam')}</DialogTitle>
                    <DialogDescription>
                        {t('editTeamDescription')}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('name')}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t('enterTeamName')} {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        {t('giveYourTeamAClearConciseName')}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('tableDescription')}</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder={t('describeTeamInDetail')}
                                            className="resize-none min-h-[80px]"
                                            {...field}
                                            value={field.value || ''}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        {t('optionalAddDetailsAboutYourTeam')}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="pt-4">
                            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
                                {t('cancel')}
                            </Button>
                            <Button type="submit">{t('saveTeam')}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
