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
import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface DeleteConfirmationDialogProps {
    onConfirm: () => void | Promise<void>;
    title: string;
    description: string;
    trigger: React.ReactElement;
    confirmLabel: string;
    cancelLabel: string;
    isLoading: boolean;
}

export function DeleteConfirmationDialog({
    onConfirm,
    title,
    description,
    trigger,
    confirmLabel,
    cancelLabel,
    isLoading: externalIsLoading,
}: DeleteConfirmationDialogProps) {
    const t = useTranslations('DeleteConfirmation');
    const [open, setOpen] = useState(false);
    const [internalIsLoading, setInternalIsLoading] = useState(false);

    const isLoading = externalIsLoading || internalIsLoading;

    const handleConfirm = async (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        setInternalIsLoading(true);
        try {
            // Callers report their own errors, so the dialog closes either way.
            await onConfirm();
            setOpen(false);
        } finally {
            setInternalIsLoading(false);
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger render={trigger} />
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isLoading}>{cancelLabel}</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={event => {
                            void handleConfirm(event);
                        }}
                        disabled={isLoading}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        data-testid="delete-confirm-button"
                    >
                        {isLoading ? t('deleting') : confirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
