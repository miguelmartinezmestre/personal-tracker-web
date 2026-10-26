'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldGroup } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QueryErrorFallback } from '@/components/ui/query-error-fallback';
import { Skeleton } from '@/components/ui/skeleton';
import { focusFirstInvalidField, getFieldErrors } from '@/components/forms/form-utils';
import { api } from '@/convex/_generated/api';
import { authClient } from '@/features/auth/client';
import { throwIfAuthClientError } from '@/features/auth/auth-client-response';
import { NotificationPreferencesCard } from '@/features/notifications/components/notification-preferences-card';
import { SettingsTextField } from '@/features/settings/components/settings-text-field';
import {
    passwordSchema,
    profileSchema,
    type PasswordFormValues,
    type ProfileFormValues,
} from '@/features/settings/schemas/settings';

function useSettingsSchemas() {
    const t = useTranslations('Settings.validation');

    return useMemo(
        () => ({
            profile: profileSchema(key => t(key)),
            password: passwordSchema(key => t(key)),
        }),
        [t]
    );
}

function ProfileCard({ name }: { name: string }) {
    const t = useTranslations('Settings');
    const schemas = useSettingsSchemas();
    const formRef = useRef<HTMLFormElement>(null);

    const updateProfile = useMutation({
        mutationFn: async (values: ProfileFormValues) =>
            throwIfAuthClientError(await authClient.updateUser({ name: values.name.trim() })),
    });

    const defaultValues: ProfileFormValues = { name };

    const form = useForm({
        defaultValues,
        validators: { onChange: schemas.profile, onSubmit: schemas.profile },
        onSubmit: async ({ value }) => {
            await updateProfile.mutateAsync(value);
            toast.success(t('profile.saved'));
        },
        onSubmitInvalid: () => focusFirstInvalidField(formRef.current),
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('profile.title')}</CardTitle>
                <CardDescription>{t('profile.description')}</CardDescription>
            </CardHeader>
            <CardContent>
                <form
                    ref={formRef}
                    noValidate
                    className="space-y-4"
                    onSubmit={event => {
                        event.preventDefault();
                        void form.handleSubmit();
                    }}
                >
                    <FieldGroup>
                        <form.Field name="name">
                            {field => (
                                <SettingsTextField
                                    name="name"
                                    label={t('profile.name')}
                                    autoComplete="name"
                                    value={field.state.value}
                                    errors={getFieldErrors(form, field)}
                                    onChange={field.handleChange}
                                    onBlur={field.handleBlur}
                                />
                            )}
                        </form.Field>
                    </FieldGroup>
                    <Button
                        type="submit"
                        disabled={updateProfile.isPending}
                        data-testid="settings-profile-save"
                    >
                        {t('profile.save')}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

function PasswordCard() {
    const t = useTranslations('Settings');
    const schemas = useSettingsSchemas();
    const formRef = useRef<HTMLFormElement>(null);

    const changePassword = useMutation({
        mutationFn: async (values: PasswordFormValues) => {
            throwIfAuthClientError(
                await authClient.changePassword({
                    currentPassword: values.currentPassword,
                    newPassword: values.newPassword,
                })
            );
            // Revoked apart so a stolen session dies while this one keeps its Convex auth token.
            throwIfAuthClientError(await authClient.revokeOtherSessions());
        },
    });

    const defaultValues: PasswordFormValues = {
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    };

    const form = useForm({
        defaultValues,
        validators: { onChange: schemas.password, onSubmit: schemas.password },
        onSubmit: async ({ value, formApi }) => {
            await changePassword.mutateAsync(value);
            toast.success(t('password.saved'));
            formApi.reset();
        },
        onSubmitInvalid: () => focusFirstInvalidField(formRef.current),
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('password.title')}</CardTitle>
                <CardDescription>{t('password.description')}</CardDescription>
            </CardHeader>
            <CardContent>
                <form
                    ref={formRef}
                    noValidate
                    className="space-y-4"
                    onSubmit={event => {
                        event.preventDefault();
                        void form.handleSubmit();
                    }}
                >
                    <FieldGroup>
                        <form.Field name="currentPassword">
                            {field => (
                                <SettingsTextField
                                    name="currentPassword"
                                    label={t('password.current')}
                                    type="password"
                                    autoComplete="current-password"
                                    value={field.state.value}
                                    errors={getFieldErrors(form, field)}
                                    onChange={field.handleChange}
                                    onBlur={field.handleBlur}
                                />
                            )}
                        </form.Field>
                        <form.Field name="newPassword">
                            {field => (
                                <SettingsTextField
                                    name="newPassword"
                                    label={t('password.new')}
                                    type="password"
                                    autoComplete="new-password"
                                    value={field.state.value}
                                    errors={getFieldErrors(form, field)}
                                    onChange={field.handleChange}
                                    onBlur={field.handleBlur}
                                />
                            )}
                        </form.Field>
                        <form.Field name="confirmPassword">
                            {field => (
                                <SettingsTextField
                                    name="confirmPassword"
                                    label={t('password.confirm')}
                                    type="password"
                                    autoComplete="new-password"
                                    value={field.state.value}
                                    errors={getFieldErrors(form, field)}
                                    onChange={field.handleChange}
                                    onBlur={field.handleBlur}
                                />
                            )}
                        </form.Field>
                    </FieldGroup>
                    <Button
                        type="submit"
                        disabled={changePassword.isPending}
                        data-testid="settings-password-save"
                    >
                        {t('password.save')}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

function AccountDeletionCard({ email }: { email: string }) {
    const t = useTranslations('Settings.deletion');
    const router = useRouter();
    const status = useQuery(convexQuery(api.auth.getAccountDeletionStatus, {}));
    const [confirmEmail, setConfirmEmail] = useState('');
    const [password, setPassword] = useState('');

    const deleteAccount = useMutation({
        mutationFn: async () =>
            throwIfAuthClientError(await authClient.softDeleteUser({ password })),
        onSuccess: () => router.replace('/login'),
    });

    if (status.isError) {
        return <QueryErrorFallback onRetry={() => void status.refetch()} />;
    }

    if (!status.data) {
        return <Skeleton className="h-48" />;
    }

    let body;

    if (status.data.isSetupUser) {
        body = <p className="text-sm">{t('setupUser')}</p>;
    } else if (status.data.organizationsNeedingNewOwner.length > 0) {
        body = (
            <div className="space-y-2 text-sm" data-testid="delete-account-blocked">
                <p>{t('needsNewOwner')}</p>
                <ul className="list-disc pl-5">
                    {status.data.organizationsNeedingNewOwner.map(name => (
                        <li key={name}>{name}</li>
                    ))}
                </ul>
            </div>
        );
    } else {
        body = (
            <form
                noValidate
                className="space-y-4"
                onSubmit={event => {
                    event.preventDefault();
                    deleteAccount.mutate();
                }}
            >
                <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
                    <li>{t('deletes')}</li>
                    <li>{t('keeps')}</li>
                </ul>
                <div className="space-y-2">
                    <Label htmlFor="delete-account-email">{t('confirmEmail', { email })}</Label>
                    <Input
                        id="delete-account-email"
                        type="email"
                        value={confirmEmail}
                        onChange={event => setConfirmEmail(event.target.value)}
                        data-testid="delete-account-email-input"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="delete-account-password">{t('password')}</Label>
                    <Input
                        id="delete-account-password"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={event => setPassword(event.target.value)}
                        data-testid="delete-account-password-input"
                    />
                </div>
                <Button
                    type="submit"
                    variant="destructive"
                    disabled={
                        deleteAccount.isPending || confirmEmail !== email || password.length === 0
                    }
                    data-testid="delete-account-button"
                >
                    {deleteAccount.isPending && <Loader2 className="animate-spin" aria-hidden />}
                    {t('submit')}
                </Button>
            </form>
        );
    }

    return (
        <Card className="border-destructive/40">
            <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2 dark:text-red-400">
                    <AlertTriangle className="size-5" aria-hidden />
                    {t('title')}
                </CardTitle>
                <CardDescription>{t('description')}</CardDescription>
            </CardHeader>
            <CardContent>{body}</CardContent>
        </Card>
    );
}

export default function SettingsPage() {
    const t = useTranslations('Settings');
    const user = useQuery(convexQuery(api.auth.getCurrentUser, {}));

    if (user.isError) {
        return <QueryErrorFallback onRetry={() => void user.refetch()} />;
    }

    if (!user.data) {
        return <Skeleton className="h-96 w-full" />;
    }

    return (
        <div className="w-full max-w-2xl space-y-6" data-testid="settings-page">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold">{t('title')}</h1>
                <p className="text-muted-foreground">{t('description')}</p>
            </div>
            <ProfileCard name={user.data.name} />
            <PasswordCard />
            <NotificationPreferencesCard />
            <AccountDeletionCard email={user.data.email} />
        </div>
    );
}
