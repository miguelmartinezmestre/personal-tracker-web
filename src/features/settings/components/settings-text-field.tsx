'use client';

import type { FieldErrorIssue } from '@/components/ui/field';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

/** A labelled text or password input of a settings form. */
export function SettingsTextField({
    name,
    label,
    value,
    errors,
    onChange,
    onBlur,
    type = 'text',
    autoComplete,
}: {
    name: string;
    label: string;
    value: string;
    errors: readonly FieldErrorIssue[];
    onChange: (value: string) => void;
    onBlur: () => void;
    type?: 'text' | 'password';
    autoComplete?: string;
}) {
    const isInvalid = errors.length > 0;

    return (
        <Field data-invalid={isInvalid}>
            <FieldLabel htmlFor={`settings-${name}`}>{label}</FieldLabel>
            <Input
                id={`settings-${name}`}
                type={type}
                autoComplete={autoComplete}
                value={value}
                onBlur={onBlur}
                onChange={event => onChange(event.target.value)}
                aria-invalid={isInvalid}
                data-testid={`settings-${name}-input`}
            />
            {isInvalid ? <FieldError errors={errors} /> : null}
        </Field>
    );
}
