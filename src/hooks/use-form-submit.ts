'use client';

import { useState, useRef } from 'react';

export function useFormSubmit<T>(mutationFn: (values: T) => Promise<void>): {
    submit: (values: T) => Promise<void>;
    isSubmitting: boolean;
} {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isSubmittingRef = useRef(false);

    const submit = async (values: T) => {
        if (isSubmittingRef.current) return;

        isSubmittingRef.current = true;
        setIsSubmitting(true);
        try {
            await mutationFn(values);
        } catch (error) {
            isSubmittingRef.current = false;
            setIsSubmitting(false);
            throw error;
        }

        isSubmittingRef.current = false;
        setIsSubmitting(false);
    };

    return { submit, isSubmitting };
}
