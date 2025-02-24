import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '../components/ui/form';
import { useMutation } from '@tanstack/react-query';
import { createObjective } from '../services/objetives';
import useAuth from '../hooks/useAuth';
import { useState } from 'react';

const formSchema = z.object({
    title: z.string(),
    description: z.string(),
    category: z.string(),
    targetValue: z.number(),
    currentValue: z.number(),
    deadline: z.date(),
    status: z.string(),
    unit: z.string(),
});

export function CustomForm({ onClose, refetch }: { onClose: () => void; refetch: () => void }) {
    const [error, setError] = useState<string | null>(null);
    const auth = useAuth();

    // 1. Define your form.
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: '',
            description: '',
            category: '',
            targetValue: 0,
            currentValue: 0,
            deadline: new Date(),
            status: '',
            unit: '',
        },
    });

    if (auth) {
        console.log(auth);
    }

    const mutation = useMutation({
        mutationFn: (values: z.infer<typeof formSchema>) => {
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
            onClose();
            refetch();
        },
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
        console.log(JSON.stringify(values, null, 2));
        mutation.mutate(values);
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Título</FormLabel>
                            <FormControl>
                                <Input placeholder="shadcn" {...field} />
                            </FormControl>
                            <FormDescription>Este es el título del objetivo.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Descripción</FormLabel>
                            <FormControl>
                                <Input placeholder="shadcn" {...field} />
                            </FormControl>
                            <FormDescription>Este es la descripción del objetivo.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Categoría</FormLabel>
                            <FormControl>
                                <Input placeholder="shadcn" {...field} />
                            </FormControl>
                            <FormDescription>Este es la categoría del objetivo.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="targetValue"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Valor objetivo</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="shadcn"
                                    type="number"
                                    {...field}
                                    onChange={e => field.onChange(e.target.valueAsNumber)}
                                />
                            </FormControl>
                            <FormDescription>
                                Este es el valor objetivo del objetivo.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="currentValue"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Valor actual</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="shadcn"
                                    type="number"
                                    {...field}
                                    onChange={e => field.onChange(e.target.valueAsNumber)}
                                />
                            </FormControl>
                            <FormDescription>Este es el valor actual del objetivo.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="deadline"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Fecha de finalización</FormLabel>
                            <FormControl>
                                <Input
                                    type="date"
                                    {...field}
                                    value={field.value.toISOString().split('T')[0]}
                                />
                            </FormControl>
                            <FormDescription>
                                Este es la fecha de finalización del objetivo.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Estado</FormLabel>
                            <FormControl>
                                <Input placeholder="shadcn" {...field} />
                            </FormControl>
                            <FormDescription>Este es el estado del objetivo.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Unidad</FormLabel>
                            <FormControl>
                                <Input placeholder="shadcn" {...field} />
                            </FormControl>
                            <FormDescription>Este es la unidad del objetivo.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                {error && <p className="text-red-500">{error}</p>}
                <Button type="submit">Submit</Button>
            </form>
        </Form>
    );
}

