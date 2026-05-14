'use client';

import { useState, useCallback, useRef } from 'react';

export function useFormSubmit<T>(mutationFn: (values: T) => Promise<void>): {
    submit: (values: T) => Promise<void>;
    isSubmitting: boolean;
} {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isSubmittingRef = useRef(false);

    const submit = useCallback(
        async (values: T) => {
            if (isSubmittingRef.current) return;

            isSubmittingRef.current = true;
            setIsSubmitting(true);
            try {
                await mutationFn(values);
            } finally {
                isSubmittingRef.current = false;
                setIsSubmitting(false);
            }
        },
        [mutationFn]
    );

    return { submit, isSubmitting };
}
