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
import { CreateOrganization, organizationSchema } from '@/features/organizations/schemas/organization';
import { useTranslations } from 'next-intl';
import { useCreateOrganization } from '@/features/organizations/hooks/use-organizations';

const defaultValues: CreateOrganization = {
    name: '',
    description: '',
};

export default function CreateOrganizationFormModal() {
    const t = useTranslations('Organizations');
    const createOrganization = useCreateOrganization();
    const [open, setOpen] = useState(false);
    const form = useForm<z.infer<typeof organizationSchema>>({
        defaultValues: defaultValues,
        validators: {
            onChange: organizationSchema,
            onSubmit: organizationSchema,
        },
        onSubmit: async ({ value }: { value: CreateOrganization }) => {
            await onSubmit(value);
        },
    });

    const onSubmit = async (values: CreateOrganization) => {
        await createOrganization.mutateAsync(values);
        setOpen(false);
        form.reset();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2" data-testid="organization-create-open">
                    <PlusCircle className="h-4 w-4" />
                    {t('createOrganization')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t('createOrganization')}</DialogTitle>
                    <DialogDescription>{t('createOrganizationDescription')}</DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form
                        onSubmit={e => {
                            e.preventDefault();
                            form.handleSubmit();
                        }}
                        className="space-y-5 py-4"
                    >
                        <FormField
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('name')}</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={t('enterOrganizationName')}
                                            {...field}
                                            data-testid="organization-name-input"
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        {t('giveYourOrganizationAClearConciseTitle')}
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
                                            placeholder={t('describeOrganizationInDetail')}
                                            className="resize-none min-h-[80px]"
                                            {...field}
                                            value={field.value || ''}
                                            data-testid="organization-description-input"
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        {t('optionalAddDetailsAboutYourOrganization')}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="pt-4">
                            <Button
                                variant="outline"
                                type="button"
                                onClick={() => setOpen(false)}
                                data-testid="organization-cancel-button"
                            >
                                {t('cancel')}
                            </Button>
                            <Button type="submit" data-testid="organization-save-button">
                                {t('saveOrganization')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
