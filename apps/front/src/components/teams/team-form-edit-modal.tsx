'use client';

import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { PlusCircle } from 'lucide-react';
import { Button } from '@repo/ui/components/button';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@repo/ui/components/form-tanstack';
import { Input } from '@repo/ui/components/input';
import { Textarea } from '@repo/ui/components/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@repo/ui/components/dialog';
import { useMutation } from '@tanstack/react-query';
import { Team, savedTeamSchema } from '@/schemas/team';
import { useTranslations } from 'next-intl';
import { useConvexMutation } from '@convex-dev/react-query';
import { api } from '@repo/backend/convex/_generated/api';
import { Doc } from '@repo/backend/convex/_generated/dataModel';


export default function EditTeamFormModal({ defaultValues }: { defaultValues: Doc<"organization"> }) {
    const t = useTranslations('Teams');
    const updateTeam = useMutation({ mutationFn: useConvexMutation(api.teams.updateTeam) });
    const [open, setOpen] = useState(false);
    const form = useForm<z.infer<typeof savedTeamSchema>>({
        defaultValues: {
            _id: defaultValues._id,
            name: defaultValues.name,
            description: defaultValues.description ?? '',
        },
        validators: {
            onChange: savedTeamSchema,
            onSubmit: savedTeamSchema,
        },
        onSubmit: async ({ value }: { value: Team }) => {
            await onSubmit(value);
        },
    });

    const onSubmit = async (values: Team) => {
        const updateData = {
            _id: values._id as any,
            name: values.name,
            description: values.description ?? undefined,
        };

        await updateTeam.mutateAsync(updateData);

        setOpen(false);
        form.reset();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2" data-testid="team-edit-open">
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
                    <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }} className="space-y-5 py-4">
                        <FormField
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('name')}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t('enterTeamName')} {...field} data-testid="team-edit-name-input" />
                                    </FormControl>
                                    <FormDescription>
                                        {t('giveYourTeamAClearConciseName')}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
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
                                            data-testid="team-edit-description-input"
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
                            <Button variant="outline" type="button" onClick={() => setOpen(false)} data-testid="team-edit-cancel-button">
                                {t('cancel')}
                            </Button>
                            <Button type="submit" data-testid="team-edit-save-button">{t('saveTeam')}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
