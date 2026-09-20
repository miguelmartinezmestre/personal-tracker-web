'use client';
import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { Button } from '@/components/ui/button';
import {
    FieldShell,
    getFieldError,
    FormControl,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form-fields';
import { Input } from '@/components/ui/input';
import {
    createUpdatePasswordSchema,
    type UpdatePasswordFormValues,
} from '@/features/settings/schemas/update-password';
import { DialogFooter } from '@/components/ui/dialog';
import { useTranslations } from 'next-intl';
import { authClient } from '@/features/auth/client';
import { toast } from 'sonner';
import { useErrorMessage } from '@/hooks/use-error-message';
export default function PasswordFormEdit() {
    const t = useTranslations('Settings');
    const getErrorMessage = useErrorMessage();
    const updatePasswordSchema = createUpdatePasswordSchema({
        weakPassword: t('weakPassword'),
        passwordsDontMatch: t('passwordMismatch'),
    });
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const passwordDefaultValues: UpdatePasswordFormValues = {
        currentPassword: '',
        confirmPassword: '',
        newPassword: '',
    };
    const form = useForm({
        defaultValues: passwordDefaultValues,
        validators: {
            onChange: updatePasswordSchema,
            onSubmit: updatePasswordSchema,
        },
        onSubmit: async ({ value }: { value: UpdatePasswordFormValues }) => {
            await onSubmit(value);
        },
    });
    const onSubmit = async (values: UpdatePasswordFormValues) => {
        if (values.newPassword !== values.confirmPassword) {
            setError(t('passwordMismatch'));
            return;
        }
        if (values.currentPassword === values.newPassword) {
            setError(t('passwordSameAsOld'));
            return;
        }
        setIsLoading(true);
        setError('');
        setMessage('');
        const fallbackErrorMessage = t('passwordUpdateFailed');
        try {
            const result = await authClient.changePassword({
                currentPassword: values.currentPassword,
                newPassword: values.newPassword,
                revokeOtherSessions: false,
            });
            if (result.error) {
                const errorMessage = getErrorMessage(result.error, fallbackErrorMessage);
                setError(errorMessage);
                toast.error(errorMessage);
            } else {
                setMessage(t('passwordUpdated'));
                toast.success(t('passwordUpdated'));
                form.reset();
            }
        } catch (caughtError) {
            const errorMessage = getErrorMessage(caughtError, fallbackErrorMessage);
            setError(errorMessage);
            toast.error(errorMessage);
        }
        setIsLoading(false);
    };
    return (
        <form
            action={() => {
                void form.handleSubmit();
            }}
            className="space-y-5 py-4"
        >
            <form.Field name="currentPassword">
                {field => (
                    <FieldShell error={getFieldError(form, field)}>
                        <FormItem>
                            <FormLabel>{t('password')}</FormLabel>
                            <FormControl>
                                <Input
                                    name={field.name}
                                    value={field.state.value}
                                    onChange={event => field.handleChange(event.target.value)}
                                    onBlur={field.handleBlur}
                                    type="password"
                                    data-testid="password-current-input"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    </FieldShell>
                )}
            </form.Field>

            <form.Field name="confirmPassword">
                {field => (
                    <FieldShell error={getFieldError(form, field)}>
                        <FormItem>
                            <FormLabel>{t('confirmPassword')}</FormLabel>
                            <FormControl>
                                <Input
                                    name={field.name}
                                    value={field.state.value}
                                    onChange={event => field.handleChange(event.target.value)}
                                    onBlur={field.handleBlur}
                                    type="password"
                                    data-testid="password-confirm-input"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    </FieldShell>
                )}
            </form.Field>

            <form.Field name="newPassword">
                {field => (
                    <FieldShell error={getFieldError(form, field)}>
                        <FormItem>
                            <FormLabel>{t('newPassword')}</FormLabel>
                            <FormControl>
                                <Input
                                    name={field.name}
                                    value={field.state.value}
                                    onChange={event => field.handleChange(event.target.value)}
                                    onBlur={field.handleBlur}
                                    type="password"
                                    data-testid="password-new-input"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    </FieldShell>
                )}
            </form.Field>

            <DialogFooter className="pt-4">
                <Button
                    variant="outline"
                    type="button"
                    onClick={() => form.reset()}
                    disabled={isLoading}
                    data-testid="password-cancel-button"
                >
                    {t('cancel')}
                </Button>
                <Button type="submit" disabled={isLoading} data-testid="password-save-button">
                    {isLoading ? t('saving') : t('savePassword')}
                </Button>
            </DialogFooter>
            {error && (
                <p className="text-destructive" data-testid="password-error-message">
                    {error}
                </p>
            )}
            {message && (
                <p
                    className="text-emerald-700 dark:text-emerald-300"
                    data-testid="password-success-message"
                >
                    {message}
                </p>
            )}
        </form>
    );
}
