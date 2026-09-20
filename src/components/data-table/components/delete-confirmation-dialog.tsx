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
    title: string;
    description: string;
    trigger?: ReactNode;
    triggerLabel?: string;
    confirmLabel: string;
    cancelLabel: string;
    isLoading: boolean;
}

export function DeleteConfirmationDialog({
    onConfirm,
    title,
    description,
    trigger,
    triggerLabel,
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
                    <Button variant="destructive" size="sm" disabled={isLoading}>
                        {triggerLabel || confirmLabel}
                    </Button>
                )}
            </AlertDialogTrigger>
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
