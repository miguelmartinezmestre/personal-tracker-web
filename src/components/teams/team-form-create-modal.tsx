'use client';

import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
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
import { CreateTeam, teamSchema } from '@/schemas/team';
import { useTranslations } from 'next-intl';
import { useConvexMutation } from '@convex-dev/react-query';
import { api } from '../../../convex/_generated/api';

const defaultValues: CreateTeam = {
    name: '',
    description: '',
};

export default function CreateTeamFormModal() {
    const t = useTranslations('Teams');
    const createTeam = useMutation({ mutationFn: useConvexMutation(api.teams.createTeam) });
    const [open, setOpen] = useState(false);
    const form = useForm<z.infer<typeof teamSchema>>({
        defaultValues: defaultValues,
        validators: {
            onChange: teamSchema,
            onSubmit: teamSchema,
        },
        onSubmit: async ({ value }: { value: CreateTeam }) => {
            await onSubmit(value);
        },
    });

    const onSubmit = async (values: CreateTeam) => {
        await createTeam.mutateAsync(values);
        setOpen(false);
        form.reset();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2" data-testid="team-create-open">
                    <PlusCircle className="h-4 w-4" />
                    {t('createTeam')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t('createTeam')}</DialogTitle>
                    <DialogDescription>
                        {t('createTeamDescription')}
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
                                        <Input placeholder={t('enterTeamName')} {...field} data-testid="team-name-input" />
                                    </FormControl>
                                    <FormDescription>
                                        {t('giveYourTeamAClearConciseTitle')}
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
                                            placeholder="Describe your team in detail"
                                            className="resize-none min-h-[80px]"
                                            {...field}
                                            value={field.value || ''}
                                            data-testid="team-description-input"
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
                            <Button variant="outline" type="button" onClick={() => setOpen(false)} data-testid="team-cancel-button">
                                {t('cancel')}
                            </Button>
                            <Button type="submit" data-testid="team-save-button">{t('saveTeam')}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
