'use client';

// Visual field primitives; field state is supplied by native TanStack Form fields.

import * as React from 'react';
import type * as LabelPrimitive from '@radix-ui/react-label';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { getOptionalString, isRecord } from '@shared/boundary-values';

type FieldContextValue = {
    error?: string;
};

const FieldContext = React.createContext<FieldContextValue | null>(null);

function formatFieldError(error: unknown): string | undefined {
    if (error === null || error === undefined) {
        return undefined;
    }
    if (typeof error === 'string') {
        return error;
    }
    if (Array.isArray(error)) {
        for (const item of error) {
            if (typeof item === 'string') {
                return item;
            }
            if (isRecord(item)) {
                const message = getOptionalString(item.message);
                if (message) {
                    return message;
                }
            }
        }
        return undefined;
    }
    if (error instanceof Error) {
        return error.message;
    }
    if (isRecord(error)) {
        return getOptionalString(error.message);
    }
    return undefined;
}

type FieldShellProps = {
    error?: unknown;
    children: React.ReactNode;
};

export function getFieldError(
    form: { state: { submissionAttempts: number } },
    field: { state: { meta: { isTouched: boolean; errors: readonly unknown[] } } }
) {
    return field.state.meta.isTouched || form.state.submissionAttempts > 0
        ? field.state.meta.errors[0]
        : undefined;
}

function FieldShell({ error, children }: FieldShellProps) {
    return (
        <FieldContext.Provider value={{ error: formatFieldError(error) }}>
            {children}
        </FieldContext.Provider>
    );
}

type FormItemContextValue = {
    id: string;
};

const FormItemContext = React.createContext<FormItemContextValue>({ id: '' });

function useFormField() {
    const fieldContext = React.useContext(FieldContext);
    const itemContext = React.useContext(FormItemContext);
    if (!fieldContext) {
        throw new Error('useFormField should be used within <FieldShell>');
    }
    const { id } = itemContext;
    return {
        error: fieldContext.error,
        formItemId: `${id}-form-item`,
        formDescriptionId: `${id}-form-item-description`,
        formMessageId: `${id}-form-item-message`,
    };
}

function FormItem({ className, ...props }: React.ComponentProps<'div'>) {
    const id = React.useId();
    return (
        <FormItemContext.Provider value={{ id }}>
            <div data-slot="form-item" className={cn('grid gap-2', className)} {...props} />
        </FormItemContext.Provider>
    );
}

function FormLabel({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
    const { error, formItemId } = useFormField();
    return (
        <Label
            data-slot="form-label"
            data-error={!!error}
            className={cn('data-[error=true]:text-destructive', className)}
            htmlFor={formItemId}
            {...props}
        />
    );
}

function FormControl({ ...props }: React.ComponentProps<typeof Slot>) {
    const { error, formItemId, formDescriptionId, formMessageId } = useFormField();
    return (
        <Slot
            data-slot="form-control"
            id={formItemId}
            aria-describedby={!error ? formDescriptionId : `${formDescriptionId} ${formMessageId}`}
            aria-invalid={!!error}
            {...props}
        />
    );
}

function FormDescription({ className, ...props }: React.ComponentProps<'p'>) {
    const { formDescriptionId } = useFormField();
    return (
        <p
            data-slot="form-description"
            id={formDescriptionId}
            className={cn('text-muted-foreground text-sm', className)}
            {...props}
        />
    );
}

function FormMessage({
    className,
    ...props
}: Omit<React.ComponentProps<'p'>, 'children'>) {
    const { error, formMessageId } = useFormField();
    if (!error) {
        return null;
    }
    return (
        <p
            data-slot="form-message"
            id={formMessageId}
            className={cn('text-destructive text-sm', className)}
            {...props}
        >
            {error}
        </p>
    );
}

export {
    FieldShell,
    FormItem,
    FormLabel,
    FormControl,
    FormDescription,
    FormMessage,
};
