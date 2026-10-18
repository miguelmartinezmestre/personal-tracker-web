'use client';

// shadcn-style Field primitives for composing forms with external form state
// (TanStack Form). Presentational only; see .agents/skills/shadcn/rules/forms.md.

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

function FieldGroup({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="field-group"
            className={cn('flex w-full flex-col gap-5', className)}
            {...props}
        />
    );
}

function Field({
    className,
    orientation = 'vertical',
    ...props
}: React.ComponentProps<'div'> & {
    orientation?: 'vertical' | 'horizontal' | 'responsive';
}) {
    return (
        <div
            data-slot="field"
            role="group"
            data-orientation={orientation}
            className={cn(
                'group/field flex w-full gap-2 data-[invalid=true]:text-destructive',
                orientation === 'vertical' && 'flex-col',
                orientation === 'horizontal' && 'flex-row items-center',
                orientation === 'responsive' &&
                    'flex-col @md/field-group:flex-row @md/field-group:items-center',
                className
            )}
            {...props}
        />
    );
}

function FieldLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
    return (
        <Label
            data-slot="field-label"
            className={cn('w-fit gap-2 leading-snug', className)}
            {...props}
        />
    );
}

function FieldDescription({ className, ...props }: React.ComponentProps<'p'>) {
    return (
        <p
            data-slot="field-description"
            className={cn(
                'text-left text-xs/relaxed leading-normal font-normal text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary',
                className
            )}
            {...props}
        />
    );
}

// Every form validates with a Standard Schema (zod), so field errors are its issues.
export type FieldErrorIssue = { message: string } | undefined;

function FieldError({
    className,
    children,
    errors,
    ...props
}: React.ComponentProps<'div'> & {
    errors?: readonly FieldErrorIssue[];
}) {
    const content = React.useMemo(() => {
        if (children) {
            return children;
        }

        if (!errors?.length) {
            return null;
        }

        const messages = [...new Set(errors.flatMap(error => (error ? [error.message] : [])))];

        if (messages.length === 1) {
            return messages[0];
        }

        if (messages.length === 0) {
            return null;
        }

        return (
            <ul className="ml-4 flex list-disc flex-col gap-1">
                {messages.map((message, index) => (
                    <li key={index}>{message}</li>
                ))}
            </ul>
        );
    }, [children, errors]);

    if (!content) {
        return null;
    }

    return (
        <div
            role="alert"
            data-slot="field-error"
            className={cn('text-xs font-normal text-destructive', className)}
            {...props}
        >
            {content}
        </div>
    );
}

export { Field, FieldGroup, FieldLabel, FieldDescription, FieldError };