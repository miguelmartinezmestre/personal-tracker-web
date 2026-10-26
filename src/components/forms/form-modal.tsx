'use client';

import { type ReactNode, useRef, useState } from 'react';
import { useForm, type AnyFormOptions } from '@tanstack/react-form';
import { Button } from '@/components/ui/button';
import type { TanStackFormApi } from './form-types';
import { focusFirstInvalidField } from './form-utils';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

type FormModalProps<TFormValues extends object> = {
    trigger: React.ReactElement;
    title: string;
    description?: string;
    formOptions: Omit<AnyFormOptions, 'onSubmit'> & {
        defaultValues: TFormValues;
    };
    onSubmit: (values: TFormValues) => Promise<void>;
    children: (form: TanStackFormApi<TFormValues>) => ReactNode;
    submitLabel: string;
    cancelLabel: string;
    pendingLabel?: string;
    isPending?: boolean;
    cancelTestId?: string;
    submitTestId?: string;
};

export default function FormModal<TFormValues extends object>({
    trigger,
    title,
    description,
    formOptions,
    onSubmit,
    children,
    submitLabel,
    cancelLabel,
    pendingLabel,
    isPending = false,
    cancelTestId,
    submitTestId,
}: FormModalProps<TFormValues>) {
    const [open, setOpenState] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);

    const setOpen = (nextOpen: boolean) => {
        // Closing without saving discards the draft, so reopening shows the stored values.
        if (!nextOpen) {
            form.reset();
        }

        setOpenState(nextOpen);
    };

    const form = useForm({
        ...formOptions,
        onSubmit: async ({ value }: { value: TFormValues }) => {
            try {
                await onSubmit(value);
            } catch {
                // The mutation cache already reports the error; keep the dialog open to retry.
                return;
            }

            setOpen(false);
        },
        onSubmitInvalid: () => focusFirstInvalidField(formRef.current),
    });

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen, details) => {
                if (
                    !nextOpen &&
                    !['close-press', 'escape-key', 'trigger-press', 'imperative-action'].includes(
                        details.reason
                    )
                ) {
                    details.cancel();

                    return;
                }

                setOpen(nextOpen);
            }}
            disablePointerDismissal
        >
            <DialogTrigger render={trigger} />
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description && <DialogDescription>{description}</DialogDescription>}
                </DialogHeader>

                {/* The schema messages replace the browser's own validation bubbles. */}
                <form
                    ref={formRef}
                    noValidate
                    onSubmit={event => {
                        event.preventDefault();
                        event.stopPropagation();
                        void form.handleSubmit();
                    }}
                    className="py-4"
                >
                    {children(form)}

                    <DialogFooter className="pt-4">
                        <Button
                            variant="outline"
                            type="button"
                            onClick={() => setOpen(false)}
                            data-testid={cancelTestId}
                        >
                            {cancelLabel}
                        </Button>
                        <Button type="submit" disabled={isPending} data-testid={submitTestId}>
                            {isPending && pendingLabel ? pendingLabel : submitLabel}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
