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

export function getFieldErrors(
    form: FormStateLike,
    field: FieldStateLike
): readonly FieldErrorIssue[] {
    if (field.state.meta.isTouched || form.state.submissionAttempts > 0) {
        return field.state.meta.errors;
    }

    return [];
}

export function focusFirstInvalidField(form: HTMLFormElement | null): void {
    requestAnimationFrame(() => {
        form?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    });
}
