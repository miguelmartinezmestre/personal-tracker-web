// Shared TanStack Form helpers used by form components.

import type { FieldErrorIssue } from '@/components/ui/field';

type FormStateLike = { state: { submissionAttempts: number } };

type FieldStateLike = {
    state: {
        meta: {
            isTouched: boolean;
            errors: readonly FieldErrorIssue[];
        };
    };
};

// Errors are shown once a field was touched or a submit was attempted;
// mirrors the guide's `isTouched && !isValid` while keeping the project's
// submit-attempt gate so stale errors never appear before the first submit.
export function getFieldErrors(
    form: FormStateLike,
    field: FieldStateLike
): readonly FieldErrorIssue[] {
    if (field.state.meta.isTouched || form.state.submissionAttempts > 0) {
        return field.state.meta.errors;
    }

    return [];
}

// Moves focus to the first invalid control after a rejected submit, so keyboard and screen
// reader users land on the error instead of staying on the submit button. Waits a frame for
// the fields to render their aria-invalid state.
export function focusFirstInvalidField(form: HTMLFormElement | null): void {
    requestAnimationFrame(() => {
        form?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    });
}
