'use client';
import * as React from 'react';
import type * as LabelPrimitive from '@radix-ui/react-label';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { getOptionalString, isRecord } from '@shared/boundary-values';
type ReadableField = {
    name: string;
    state: {
        value: unknown;
        meta?: {
            isTouched?: boolean;
            errors?: readonly unknown[];
        };
    };
    handleBlur: () => void;
    handleChange: (value: unknown) => void;
};
type ReadableForm = {
    state?: {
        submitCount?: number;
        isSubmitted?: boolean;
    };
    Field: (props: {
        name: string;
        children: (field: ReadableField) => React.ReactNode;
    }) => React.ReactNode | Promise<React.ReactNode>;
};
function asReadableForm(form: {
    state?: ReadableForm['state'];
    Field: (props: never) => React.ReactNode | Promise<React.ReactNode>;
}): ReadableForm {
    // TanStack Form Field is invariant across form value types.
    return form as ReadableForm;
}
const TanstackFormContext = React.createContext<ReadableForm | null>(null);
type TanstackFormProviderProps = {
    form?: {
        state?: ReadableForm['state'];
        Field: (props: never) => React.ReactNode | Promise<React.ReactNode>;
    };
    children?: React.ReactNode;
    state?: ReadableForm['state'];
    Field?: (props: never) => React.ReactNode | Promise<React.ReactNode>;
};
function Form({ form, children, state, Field }: TanstackFormProviderProps) {
    const providedForm = form ?? (Field ? { state, Field } : null);
    if (!providedForm) {
        throw new Error('Form requires a form instance');
    }
    return (<TanstackFormContext.Provider value={asReadableForm(providedForm)}>
            {children}
        </TanstackFormContext.Provider>);
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
const FormFieldContext = React.createContext<FormFieldContextValue | null>(null);
export type FormInputValue = string | number | readonly string[] | undefined;
function readFieldChangeValue(arg: unknown): unknown {
    if (isRecord(arg) && isRecord(arg.target) && 'value' in arg.target) {
        return arg.target.value;
    }
    return arg;
}
function formatFieldError(error: unknown): string | undefined {
    if (error === null || error === undefined) {
        return undefined;
    }
    if (typeof error === "string") {
        return error;
    }
    if (Array.isArray(error)) {
        for (const item of error) {
            if (typeof item === "string") {
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
export type RHFCompatibleField<TValue = FormInputValue> = {
    name: string;
    value: TValue;
    onChange: (value: unknown) => void;
    onBlur: () => void;
};
type FormFieldProps<TValue> = {
    name: string;
    render: (args: {
        field: RHFCompatibleField<TValue>;
    }) => React.ReactNode;
};
function FormField<TValue = FormInputValue>({ name, render }: FormFieldProps<TValue>) {
    const form = useTanstackForm();
    return (<form.Field name={name}>
            {field => {
            const isTouched = field.state.meta?.isTouched;
            const hasSubmitted = Boolean((form.state?.submitCount ?? 0) > 0 || form.state?.isSubmitted);
            const firstError = isTouched || hasSubmitted
                ? formatFieldError(field.state.meta?.errors?.[0])
                : undefined;
            const adaptedField: RHFCompatibleField<TValue> = {
                name: field.name,
                value: field.state.value as TValue,
                onBlur: field.handleBlur,
                onChange: arg => {
                    field.handleChange(readFieldChangeValue(arg));
                },
            };
            return (<FormFieldContext.Provider value={{ name, error: firstError }}>
                        {render({ field: adaptedField })}
                    </FormFieldContext.Provider>);
        }}
        </form.Field>);
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
    return (<FormItemContext.Provider value={{ id }}>
            <div data-slot="form-item" className={cn('grid gap-2', className)} {...props}/>
        </FormItemContext.Provider>);
}
function FormLabel({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
    const { error, formItemId } = useFormField();
    return (<Label data-slot="form-label" data-error={!!error} className={cn('data-[error=true]:text-destructive', className)} htmlFor={formItemId} {...props}/>);
}
function FormControl({ ...props }: React.ComponentProps<typeof Slot>) {
    const { error, formItemId, formDescriptionId, formMessageId } = useFormField();
    return (<Slot data-slot="form-control" id={formItemId} aria-describedby={!error ? formDescriptionId : `${formDescriptionId} ${formMessageId}`} aria-invalid={!!error} {...props}/>);
}
function FormDescription({ className, ...props }: React.ComponentProps<'p'>) {
    const { formDescriptionId } = useFormField();
    return (<p data-slot="form-description" id={formDescriptionId} className={cn('text-muted-foreground text-sm', className)} {...props}/>);
}
function FormMessage({ className, ...props }: React.ComponentProps<'p'>) {
    const { error, formMessageId } = useFormField();
    const body = error ? formatFieldError(error) : props.children;
    if (!body) {
        return null;
    }
    return (<p data-slot="form-message" id={formMessageId} className={cn('text-destructive text-sm', className)} {...props}>
            {body}
        </p>);
}
export { useFormField, Form, FormItem, FormLabel, FormControl, FormDescription, FormMessage, FormField, };
