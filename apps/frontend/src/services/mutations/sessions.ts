import { useMutation } from '@tanstack/react-query';
import { invalidateSession } from '../http/sessions';

export const useInvalidateSessionMutation = (
    setError: (error: string) => void,
    setOpen: (open: boolean) => void,
    refetch: () => void
) => {
    const mutation = useMutation({
        mutationFn: (sessionId: number) => {
            return invalidateSession(sessionId);
        },
        onError: (error: Error) => {
            setError(error.message);
        },
        onSuccess: () => {
            setOpen(false);
            refetch();
        },
    });

    return { mutation };
};
