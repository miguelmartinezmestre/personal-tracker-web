import { UpdateProgress } from '../../models/update-progress';
import { useMutation } from '@tanstack/react-query';
import {
    createUpdateProgress,
    deleteUpdateProgress,
    updateUpdateProgress,
} from '../http/update-progress';
import { schema } from '../../schemas/update-progress';
import { z } from 'zod';

export const useUpdateProgressMutation = (
    setError: (error: string) => void,
    setOpen: (open: boolean) => void,
    refetch: () => void
) => {
    const mutation = useMutation({
        mutationFn: (values: z.infer<typeof schema>) => {
            return createUpdateProgress({
                goalId: values.goalId,
                updatedValue: values.updatedValue,
                updateDate: values.updateDate,
                comment: values.comment,
            } as UpdateProgress);
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

export const useUpdateUpdateProgressMutation = (
    setError: (error: string) => void,
    setOpen: (open: boolean) => void,
    refetch: () => void
) => {
    const mutation = useMutation({
        mutationFn: (values: z.infer<typeof schema>) => {
            return updateUpdateProgress({
                id: values.id,
                goalId: values.goalId,
                updatedValue: values.updatedValue,
                updateDate: values.updateDate,
                comment: values.comment,
            } as UpdateProgress);
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

export const useDeleteUpdateProgressMutation = (
    setError: (error: string) => void,
    setOpen: (open: boolean) => void,
    refetch: () => void
) => {
    const mutation = useMutation({
        mutationFn: (id: number) => {
            return deleteUpdateProgress(id);
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
