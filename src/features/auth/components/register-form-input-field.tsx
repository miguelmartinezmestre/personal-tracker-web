'use client';

import {
    FieldShell,
    getFieldError,
    FormControl,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form-fields';
import { Input } from '@/components/ui/input';
import type { TanStackFormApi } from '@/components/forms/form-types';
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
            {field => (
                <FieldShell error={getFieldError(form, field)}>
                    <FormItem>
                        <FormLabel className="text-foreground">{label}</FormLabel>
                        <FormControl>
                            <Input
                                name={field.name}
                                value={
                                    typeof field.state.value === 'string' ||
                                    typeof field.state.value === 'number'
                                        ? field.state.value
                                        : ''
                                }
                                onChange={event => field.handleChange(event.target.value)}
                                onBlur={field.handleBlur}
                                type={type}
                                placeholder={placeholder}
                                className="focus:ring-2 focus:ring-primary/20"
                                data-testid={testId}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                </FieldShell>
            )}
        </form.Field>
    );
}
