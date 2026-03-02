'use client';

import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
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
  OrganizationMember,
  savedOrganizationMemberSchema,
} from '@/features/organizations/schemas/organization-member';
import {
  Select,
  SelectItem,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { OrganizationRole } from '../types/roles';
import { useTranslations } from 'next-intl';
import { useUpdateOrganizationMember } from '@/features/organizations/hooks/use-organization-members';

export default function OrganizationMemberEditFormModal({
  defaultValues,
}: {
  defaultValues: OrganizationMember;
}) {
  const t = useTranslations('OrganizationMembers');

  const roleOptions = [
    { value: OrganizationRole.OWNER, label: t('roles.owner') },
    { value: OrganizationRole.MEMBER, label: t('roles.member') },
  ];
  const updateOrganizationMember = useUpdateOrganizationMember();
  const [open, setOpen] = useState(false);
  const form = useForm<OrganizationMember>({
    defaultValues: defaultValues,
    validators: {
      onChange: savedOrganizationMemberSchema,
      onSubmit: savedOrganizationMemberSchema,
    },
    onSubmit: async ({ value }: { value: OrganizationMember }) => {
      await onSubmit(value);
    },
  });

  const onSubmit = async (values: OrganizationMember) => {
    const updateData = {
      memberId: values.id,
      organizationId: values.organizationId,
      role: values.role as 'owner' | 'admin' | 'member',
    };

    await updateOrganizationMember.mutateAsync(updateData);

    setOpen(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" data-testid="organization-member-edit-open">
          <PlusCircle className="h-4 w-4" />
          {t('edit')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('edit')}</DialogTitle>
          <DialogDescription>{t('editOrganizationMemberDescription')}</DialogDescription>
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
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('email')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('enterEmail')}
                      type="email"
                      {...field}
                      value={field.value || ''}
                      onChange={e => field.onChange(e.target.value)}
                      data-testid="organization-member-edit-email-input"
                    />
                  </FormControl>
                  <FormDescription>
                    {t('giveYourOrganizationMemberAClearConciseEmail')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('role')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || 'member'}>
                    <FormControl>
                      <SelectTrigger data-testid="organization-member-edit-role-select">
                        <SelectValue placeholder={t('selectRole')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roleOptions.map(role => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>{t('currentRoleOfYourOrganizationMember')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button
                variant="outline"
                type="button"
                onClick={() => setOpen(false)}
                data-testid="organization-member-edit-cancel-button"
              >
                {t('cancel')}
              </Button>
              <Button type="submit" data-testid="organization-member-edit-save-button">
                {t('saveOrganizationMember')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
