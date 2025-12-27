'use client';

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
import { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

interface DeleteConfirmationDialogProps {
    onConfirm: () => void | Promise<void>;
    title?: string;
    description?: string;
    trigger?: ReactNode;
    triggerLabel?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    isLoading?: boolean;
}

export function DeleteConfirmationDialog({
    onConfirm,
    title,
    description,
    trigger,
    triggerLabel,
    confirmLabel,
    cancelLabel,
    variant = 'destructive',
    size = 'sm',
    isLoading = false,
}: DeleteConfirmationDialogProps) {
    const t = useTranslations('DeleteConfirmation');

    const resolvedConfirmLabel = confirmLabel ?? t('confirm');
    const resolvedCancelLabel = cancelLabel ?? t('cancel');

    const handleConfirm = async () => {
        await onConfirm();
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                {trigger || (
                    <Button variant={variant} size={size} disabled={isLoading}>
                        {triggerLabel || resolvedConfirmLabel}
                    </Button>
                )}
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title || t('defaultTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {description || t('defaultDescription')}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isLoading}>{resolvedCancelLabel}</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {isLoading ? t('deleting') : resolvedConfirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

