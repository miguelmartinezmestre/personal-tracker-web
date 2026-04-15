'use client';

import { type ReactNode, useState } from 'react';
import { useForm, type FormOptions } from '@tanstack/react-form';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Form } from '@/components/ui/form-tanstack';

type FormModalProps<TFormValues extends Record<string, unknown>> = {
    trigger: ReactNode;
    title: string;
    description?: string;
    formOptions: Omit<FormOptions<TFormValues, undefined>, 'onSubmit'>;
    onSubmit: (values: TFormValues) => Promise<void>;
    children: (form: ReturnType<typeof useForm<TFormValues, undefined>>) => ReactNode;
    submitLabel: string;
    cancelLabel: string;
    pendingLabel?: string;
    isPending?: boolean;
    submitDisabled?: boolean;
    contentClassName?: string;
    cancelTestId?: string;
    submitTestId?: string;
};

export default function FormModal<TFormValues extends Record<string, unknown>>({
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
    submitDisabled = false,
    contentClassName = 'sm:max-w-[600px] max-h-[90vh] overflow-y-auto',
    cancelTestId,
    submitTestId,
}: FormModalProps<TFormValues>) {
    const [open, setOpen] = useState(false);

    const form = useForm<TFormValues, undefined>({
        ...formOptions,
        onSubmit: async ({ value }: { value: TFormValues }) => {
            await onSubmit(value);
            setOpen(false);
            form.reset();
        },
    } as FormOptions<TFormValues, undefined>);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className={contentClassName}>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description && <DialogDescription>{description}</DialogDescription>}
                </DialogHeader>

                <Form {...form}>
                    <form
                        action={() => {
                            form.handleSubmit();
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
                </Form>
            </DialogContent>
        </Dialog>
    );
}
