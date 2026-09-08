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
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import type { ReactNode } from 'react';
import { useState } from 'react';
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
    isLoading: externalIsLoading = false,
}: DeleteConfirmationDialogProps) {
    const t = useTranslations('DeleteConfirmation');
    const [open, setOpen] = useState(false);
    const [internalIsLoading, setInternalIsLoading] = useState(false);

    const isLoading = externalIsLoading || internalIsLoading;
    const resolvedConfirmLabel = confirmLabel ?? t('confirm');
    const resolvedCancelLabel = cancelLabel ?? t('cancel');

    const handleConfirm = async (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        setInternalIsLoading(true);
        try {
            await onConfirm();
            setOpen(false);
        } catch {
            setOpen(true);
        }
        setInternalIsLoading(false);
    };

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
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
                    <AlertDialogCancel disabled={isLoading}>
                        {resolvedCancelLabel}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={event => {
                            void handleConfirm(event);
                        }}
                        disabled={isLoading}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        data-testid="delete-confirm-button"
                    >
                        {isLoading ? t('deleting') : resolvedConfirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
