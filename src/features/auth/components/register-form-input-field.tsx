'use client';

import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { TanStackFormApi } from '@/components/forms/form-types';
import { getFieldErrors } from '@/components/forms/form-utils';
import type { RegisterFormValues } from '@/features/auth/schemas/register';

interface RegisterFormInputFieldProps {
    form: TanStackFormApi<RegisterFormValues>;
    name: 'username' | 'email' | 'password' | 'confirmPassword';
    label: string;
    placeholder: string;
    type?: string;
    testId: string;
}

export function RegisterFormInputField({
    form,
    name,
    label,
    placeholder,
    type = 'text',
    testId,
}: RegisterFormInputFieldProps) {
    return (
        <form.Field name={name}>
            {field => {
                const errors = getFieldErrors(form, field);
                const isInvalid = !!errors.length;
                let value: string | number;
                if (
                    typeof field.state.value === 'string' ||
                    typeof field.state.value === 'number'
                ) {
                    value = field.state.value;
                } else {
                    value = '';
                }
                return (
                    <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name} className="text-foreground">
                            {label}
                        </FieldLabel>
                        <Input
                            id={field.name}
                            name={field.name}
                            value={value}
                            onChange={event => field.handleChange(event.target.value)}
                            onBlur={field.handleBlur}
                            type={type}
                            placeholder={placeholder}
                            aria-invalid={isInvalid}
                            className="focus:ring-2 focus:ring-primary/20"
                            data-testid={testId}
                        />
                        {isInvalid && <FieldError errors={errors} />}
                    </Field>
                );
            }}
        </form.Field>
    );
}
