import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { GenericForm } from '../components/generic-form';
export const Route = createFileRoute('/formtest')({
    component: RouteComponent,
});

function RouteComponent() {
    const schema = z.object({
        name: z.string(),
        email: z.string().email(),
        password: z.string().min(8),
        options: z.enum(['option1', 'option2', 'option3']),
        boolean: z.boolean(),
    });

    const defaultValues = {
        name: '',
        email: '',
        password: '',
        options: "option1" as const,
        boolean: true,
    };

    const onSubmit = (data: z.infer<typeof schema>) => {
        console.log(data);
    };

    return (
        <>
            <GenericForm schema={schema} defaultValues={defaultValues} onSubmit={onSubmit} />
        </>
    );
}
