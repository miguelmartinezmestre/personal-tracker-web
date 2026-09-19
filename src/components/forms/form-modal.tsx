'use client';

import { type ReactNode, useState } from 'react';
import { useForm, type AnyFormOptions } from '@tanstack/react-form';
import { Button } from '@/components/ui/button';
import type { TanStackFormApi } from './form-types';
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
    trigger?: ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    title: string;
    description?: string;
    formOptions: Omit<AnyFormOptions, 'onSubmit'> & {
        defaultValues: TFormValues;
    };
    onSubmit: (values: TFormValues) => Promise<void>;
    children: (form: TanStackFormApi) => ReactNode;
    submitLabel: string;
    cancelLabel: string;
    pendingLabel?: string;
    isPending?: boolean;
    submitDisabled?: boolean;
    contentClassName?: string;
    cancelTestId?: string;
    submitTestId?: string;
};

export default function FormModal<TFormValues extends object>({
    trigger,
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange,
    title,
    description,
    formOptions,
    onSubmit,
    children,
    submitLabel,
    cancelLabel,
    pendingLabel,
    isPending = false,
    submitDisabled = false,
    contentClassName = 'sm:max-w-[600px] max-h-[90vh] overflow-y-auto',
    cancelTestId,
    submitTestId,
}: FormModalProps<TFormValues>) {
    const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : uncontrolledOpen;

    const setOpen = (nextOpen: boolean) => {
        if (isControlled) {
            controlledOnOpenChange?.(nextOpen);
        } else {
            setUncontrolledOpen(nextOpen);
        }
    };

    const form = useForm({
        ...formOptions,
        onSubmit: async ({ value }: { value: TFormValues }) => {
            await onSubmit(value);
            setOpen(false);
            form.reset();
        },
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
            <DialogContent className={contentClassName}>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description && <DialogDescription>{description}</DialogDescription>}
                </DialogHeader>

                <form
                    onSubmit={event => {
                        event.preventDefault();
                        event.stopPropagation();
                        void form.handleSubmit();
                    }}
                    className="space-y-5 py-4"
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
                        <Button
                            type="submit"
                            disabled={isPending || submitDisabled}
                            data-testid={submitTestId}
                        >
                            {isPending && pendingLabel ? pendingLabel : submitLabel}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
