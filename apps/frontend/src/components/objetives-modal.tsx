import {
    DialogHeader,
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { createObjective } from '../services/objetives';
import useAuth from '../hooks/useAuth';
import { useState } from 'react';
import { GenericForm } from './generic-form';

const objetiveSchema = z.object({
    title: z.string(),
    description: z.string(),
    category: z.string(),
    targetValue: z.number(),
    currentValue: z.number(),
    deadline: z.date(),
    status: z.string(),
    unit: z.string(),
});

export function ObjetivesModal({ refetch }: { refetch: () => void }) {
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const auth = useAuth();

    const handleClose = () => {
        setOpen(false);
    };

    const mutation = useMutation({
        mutationFn: (values: z.infer<typeof objetiveSchema>) => {
            return createObjective({
                title: values.title,
                description: values.description,
                category: values.category,
                targetValue: values.targetValue,
                currentValue: values.currentValue,
                deadline: values.deadline,
                status: values.status,
                unit: values.unit,
                userId: auth ? Number(auth.id) : -1,
            });
        },
        onError: (error: Error) => {
            setError(error.message);
        },
        onSuccess: () => {
            handleClose();
            refetch();
        },
    });

    function onSubmit(values: z.infer<typeof objetiveSchema>) {
        console.log(JSON.stringify(values, null, 2));
        mutation.mutate(values);
    }

    const defaultValues = {
        title: '',
        description: '',
        category: '',
        targetValue: 0,
        currentValue: 0,
        deadline: new Date(),
        status: '',
        unit: '',
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">Crear objetivo</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Crear objetivo</DialogTitle>
                    <DialogDescription>Completa los detalles del nuevo objetivo</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <GenericForm
                        schema={objetiveSchema}
                        defaultValues={defaultValues}
                        onSubmit={onSubmit}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
