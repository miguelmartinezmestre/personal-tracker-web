'use client';

import { useState, useCallback } from 'react';

export function useFormSubmit<T>(mutationFn: (values: T) => Promise<void>): {
    submit: (values: T) => Promise<void>;
    isSubmitting: boolean;
} {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const submit = useCallback(
        async (values: T) => {
            if (isSubmitting) return;

            setIsSubmitting(true);
            try {
                await mutationFn(values);
            } finally {
                setIsSubmitting(false);
            }
        },
        [isSubmitting, mutationFn]
    );

    return { submit, isSubmitting };
}

export function useFormSubmitMutation(mutation: { isPending: boolean }): {
    isSubmitting: boolean;
    buttonProps: {
        disabled: boolean;
        isLoading: boolean;
    };
} {
    const isSubmitting = mutation.isPending;

    return {
        isSubmitting,
        buttonProps: {
            disabled: isSubmitting,
            isLoading: isSubmitting,
        },
    };
}
