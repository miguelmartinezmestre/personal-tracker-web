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
} from '@/components/ui/form-tanstack';
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
import {
  Organization,
  savedOrganizationSchema,
} from '@/features/organizations/schemas/organization';
import { useTranslations } from 'next-intl';
import { useUpdateOrganization } from '@/features/organizations/hooks/use-organizations';

export default function EditOrganizationFormModal({
  defaultValues,
}: {
  defaultValues: Organization;
}) {
  const t = useTranslations('Organizations');
  const updateOrganization = useUpdateOrganization();
  const [open, setOpen] = useState(false);
  const form = useForm<z.infer<typeof savedOrganizationSchema>>({
    defaultValues: {
      id: defaultValues.id,
      name: defaultValues.name,
      description: defaultValues.description ?? '',
    },
    validators: {
      onChange: savedOrganizationSchema,
      onSubmit: savedOrganizationSchema,
    },
    onSubmit: async ({ value }: { value: Organization }) => {
      await onSubmit(value);
    },
  });

  const onSubmit = async (values: Organization) => {
    const updateData = {
      id: values.id || defaultValues.id,
      name: values.name,
      description: values.description ?? undefined,
    };

    await updateOrganization.mutateAsync(updateData);

    setOpen(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" data-testid="organization-edit-open">
          <PlusCircle className="h-4 w-4" />
          {t('editOrganization')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('editOrganization')}</DialogTitle>
          <DialogDescription>{t('editOrganizationDescription')}</DialogDescription>
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
                      data-testid="organization-edit-name-input"
                    />
                  </FormControl>
                  <FormDescription>{t('giveYourOrganizationAClearConciseName')}</FormDescription>
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
                      data-testid="organization-edit-description-input"
                    />
                  </FormControl>
                  <FormDescription>{t('optionalAddDetailsAboutYourOrganization')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button
                variant="outline"
                type="button"
                onClick={() => setOpen(false)}
                data-testid="organization-edit-cancel-button"
              >
                {t('cancel')}
              </Button>
              <Button type="submit" data-testid="organization-edit-save-button">
                {t('saveOrganization')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
