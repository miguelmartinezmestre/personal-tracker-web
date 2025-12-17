'use client';

import { useTranslations } from 'next-intl';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@repo/ui/components/alert-dialog';
import { Button } from '@repo/ui/components/button';
// import { useAuthContext } from '../src/providers/auth-provider';
// import { useDeleteUserMutation } from '../services/mutations/user';

export function ConfirmationDeleteAccount() {
    const t = useTranslations('DeleteAccount');
    const tCommon = useTranslations('Common');

    // const { user } = useAuthContext();
    // const { mutation } = useDeleteUserMutation();

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="outline">{t('trigger')}</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t('title')}</AlertDialogTitle>
                    <AlertDialogDescription>{t('description')}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{tCommon('actions.cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => {
                            // mutation.mutate({ _id: user.id });
                        }}
                    >
                        {t('confirm')}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
