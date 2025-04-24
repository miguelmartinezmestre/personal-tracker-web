import { Objetive } from "../../models/objetive";
import { createObjective } from "../http/objectives";

import { useMutation } from "@tanstack/react-query";
import { schema } from "../../schemas/objective";
import { z } from "zod";

export const useObjectiveMutation = (userId: number, setError: (error: string) => void, setOpen: (open: boolean) => void, refetch: () => void) => {
    const mutation = useMutation({
        mutationFn: (values: z.infer<typeof schema>) => {
            return createObjective({
                title: values.title,
                description: values.description,
                category: values.category,
                targetValue: values.targetValue,
                currentValue: values.currentValue,
                deadline: values.deadline,
                status: values.status,
                unit: values.unit,
                userId: userId,
            } as Objetive);
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

export const useUpdateObjectiveMutation = (userId: number, setError: (error: string) => void, setUpdateOpen: (open: boolean) => void, refetch: () => void) => {
    const updateMutation = useMutation({
        mutationFn: (values: z.infer<typeof schema>) => {
            if (!values.id) {
                throw new Error('ID is required for updating an objective');
            }
            return updateObjective({
                id: values.id,
                title: values.title,
                description: values.description,
                category: values.category,
                targetValue: values.targetValue,
                currentValue: values.currentValue,
                deadline: values.deadline,
                status: values.status,
                unit: values.unit,
                userId: user ? Number(user.id) : -1,
            });
        },
        onError: (error: Error) => {
            setError(error.message);
        },
        onSuccess: () => {
            setUpdateOpen(false);
            refetch();
        },
    });

    return { updateMutation };
}