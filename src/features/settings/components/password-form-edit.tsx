'use client';

import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form-tanstack';
import { Input } from '@/components/ui/input';
import { updatePasswordSchema } from '@/features/settings/schemas/update-password';
import { DialogFooter } from '@/components/ui/dialog';
import { useTranslations } from 'next-intl';
import { authClient } from '@/features/auth/auth-client';
import { toast } from 'sonner';

export default function PasswordFormEdit() {
  const t = useTranslations('Settings');
  const [isLoading, setIsLoading] = useState(false);
  const [, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const form = useForm<z.infer<typeof updatePasswordSchema>>({
    defaultValues: {
      password: '',
      confirmPassword: '',
      newPassword: '',
    },
    validators: {
      onChange: updatePasswordSchema,
      onSubmit: updatePasswordSchema,
    },
    onSubmit: async ({ value }: { value: z.infer<typeof updatePasswordSchema> }) => {
      await onSubmit(value);
    },
  });

  const onSubmit = async (values: z.infer<typeof updatePasswordSchema>) => {
    // Validate that password confirmation matches
    if (values.password !== values.confirmPassword) {
      setError(t('passwordMismatch'));
      return;
    }

    // Validate that new password is different from current
    if (values.password === values.newPassword) {
      setError(t('passwordSameAsOld'));
      return;
    }

    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const result = await authClient.changePassword({
        currentPassword: values.password,
        newPassword: values.newPassword,
        revokeOtherSessions: false, // Keep other sessions active
      });

      if (result.error) {
        setError(result.error.message || t('passwordUpdateFailed'));
        toast.error(result.error.message || t('passwordUpdateFailed'));
      } else {
        setMessage(t('passwordUpdated'));
        toast.success(t('passwordUpdated'));
        setOpen(false);
        form.reset();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('passwordUpdateFailed');
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

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
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('password')}</FormLabel>
              <FormControl>
                <Input {...field} type="password" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('confirmPassword')}</FormLabel>
              <FormControl>
                <Input {...field} type="password" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('newPassword')}</FormLabel>
              <FormControl>
                <Input {...field} type="password" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter className="pt-4">
          <Button
            variant="outline"
            type="button"
            onClick={() => setOpen(false)}
            disabled={isLoading}
          >
            {t('cancel')}
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? t('saving') : t('savePassword')}
          </Button>
        </DialogFooter>
        {error && <p className="text-red-500">{error}</p>}
        {message && <p className="text-green-500">{message}</p>}
      </form>
    </Form>
  );
}
