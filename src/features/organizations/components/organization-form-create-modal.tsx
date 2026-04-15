'use client';

import { z } from 'zod';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form-tanstack';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    CreateOrganization,
    organizationSchema,
} from '@/features/organizations/schemas/organization';
import { useTranslations } from 'next-intl';
import { useCreateOrganization } from '@/features/organizations/hooks/use-organizations';
import FormModal from '@/components/form-modal';

const defaultValues: CreateOrganization = {
    name: '',
    description: '',
};

export default function CreateOrganizationFormModal() {
    const t = useTranslations('Organizations');
    const createOrganization = useCreateOrganization();

    return (
        <FormModal<z.infer<typeof organizationSchema>>
            trigger={
                <Button className="gap-2" data-testid="organization-create-open">
                    <PlusCircle className="h-4 w-4" />
                    {t('createOrganization')}
                </Button>
            }
            title={t('createOrganization')}
            description={t('createOrganizationDescription')}
            formOptions={{
                defaultValues,
                validators: {
                    onChange: organizationSchema,
                    onSubmit: organizationSchema,
                },
            }}
            onSubmit={async (values: CreateOrganization) => {
                await createOrganization.mutateAsync(values);
            }}
            submitLabel={t('saveOrganization')}
            cancelLabel={t('cancel')}
            cancelTestId="organization-cancel-button"
            submitTestId="organization-save-button"
        >
            {() => (
                <>
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
                                        value={(field.value as string) || ''}
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
                </>
            )}
        </FormModal>
    );
}
