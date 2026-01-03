'use client';

import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { Slot } from '@radix-ui/react-slot';

import { cn } from '@repo/ui/lib/utils';
import { Label } from '@repo/ui/components/label';

// Define a generic type for the form instance
type FormInstance = {
    state?: {
        submitCount?: number;
        isSubmitted?: boolean;
    };
    Field: React.ComponentType<{
        name: string;
        children: (field: {
            name: string;
            state: {
                value: any;
                meta?: {
                    isTouched?: boolean;
                    errors?: string[];
                };
            };
            handleBlur: () => void;
            handleChange: (value: any) => void;
        }) => React.ReactNode;
    }>;
    [key: string]: unknown;
};

// Provide TanStack form instance to descendants
const TanstackFormContext = React.createContext<FormInstance | null>(null);

type TanstackFormProviderProps = {
    form?: FormInstance;
    children?: React.ReactNode;
} & Record<string, unknown>;

function Form({ form, children, ...rest }: TanstackFormProviderProps) {
    const providedForm = form ?? (rest as FormInstance);
    return (
        <TanstackFormContext.Provider value={providedForm}>{children}</TanstackFormContext.Provider>
    );
}

function useTanstackForm() {
    const form = React.useContext(TanstackFormContext);
    if (!form) {
        throw new Error('useTanstackForm must be used within <Form>');
    }
    return form;
}

type FormFieldContextValue = {
    name: string;
    error?: string;
};

const FormFieldContext = React.createContext<FormFieldContextValue>({ name: '', error: undefined });

type RHFCompatibleField = {
    name: string;
    value: any;
    onChange: (value: any) => void;
    onBlur: () => void;
};

type FormFieldProps = {
    name: string;
    control?: unknown; // Ignored; kept for compatibility with existing usage
    render: (args: { field: RHFCompatibleField }) => React.ReactNode;
};

function FormField({ name, render }: FormFieldProps) {
    const form = useTanstackForm();

    return (
        <form.Field name={name}>
            {field => {
                const isTouched = field.state?.meta?.isTouched;
                const hasSubmitted = Boolean(
                    (form.state?.submitCount ?? 0) > 0 || form.state?.isSubmitted
                );
                const firstError: string | undefined =
                    isTouched || hasSubmitted ? field.state?.meta?.errors?.[0] : undefined;
                const adaptedField: RHFCompatibleField = {
                    name: field.name,
                    value: field.state.value,
                    onBlur: field.handleBlur,
                    onChange: arg => {
                        const nextValue =
                            arg && typeof arg === 'object' && 'target' in arg
                                ? (arg as { target: { value: any } }).target.value
                                : arg;
                        field.handleChange(nextValue);
                    },
                };

                return (
                    <FormFieldContext.Provider value={{ name, error: firstError }}>
                        {render({ field: adaptedField })}
                    </FormFieldContext.Provider>
                );
            }}
        </form.Field>
    );
}

type FormItemContextValue = {
    id: string;
};

const FormItemContext = React.createContext<FormItemContextValue>({ id: '' });

function useFormField() {
    const fieldContext = React.useContext(FormFieldContext);
    const itemContext = React.useContext(FormItemContext);

    if (!fieldContext) {
        throw new Error('useFormField should be used within <FormField>');
    }

    const { id } = itemContext;

    return {
        id,
        name: fieldContext.name,
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
            aria-describedby={
                !error ? `${formDescriptionId}` : `${formDescriptionId} ${formMessageId}`
            }
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

function FormMessage({ className, ...props }: React.ComponentProps<'p'>) {
    const { error, formMessageId } = useFormField();
    const body = error ? String(error ?? '') : props.children;

    if (!body) {
        return null;
    }

    return (
        <p
            data-slot="form-message"
            id={formMessageId}
            className={cn('text-destructive text-sm', className)}
            {...props}
        >
            {body}
        </p>
    );
}

export {
    useFormField,
    Form,
    FormItem,
    FormLabel,
    FormControl,
    FormDescription,
    FormMessage,
    FormField,
};
