// Shared TanStack Form helpers used by form components.

type FormStateLike = { state: { submissionAttempts: number } };
type FieldStateLike = {
    state: {
        meta: {
            isTouched: boolean;
            errors: readonly unknown[];
        };
    };
};

// Errors are shown once a field was touched or a submit was attempted;
// mirrors the guide's `isTouched && !isValid` while keeping the project's
// submit-attempt gate so stale errors never appear before the first submit.
export function getFieldErrors(form: FormStateLike, field: FieldStateLike): readonly unknown[] {
    return field.state.meta.isTouched || form.state.submissionAttempts > 0
        ? field.state.meta.errors
        : [];
}
