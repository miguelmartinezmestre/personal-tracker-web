import { createFileRoute } from '@tanstack/react-router';
import { DataTable } from '../components/table';
import { DashboardLayout } from '../components/dashboard-layout';
import { ColumnDef } from '@tanstack/react-table';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createObjective, getObjectives } from '../services/objetives';
import { Objetive } from '../models/objetive';
import useAuth from '../hooks/useAuth';
import { GenericForm } from '../components/generic-form';
import { z } from 'zod';
import { Modal } from '../components/modal';
import { useState } from 'react';
export const Route = createFileRoute('/objetives')({
    component: RouteComponent,
});

function RouteComponent() {
    const auth = useAuth();
    const [, setError] = useState<string | null>(null);

    const { data, refetch, isLoading } = useQuery({
        queryKey: ['objetives'],
        queryFn: () => getObjectives(auth.id),
    });

    const [open, setOpen] = useState(false);

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
            setOpen(false);
            refetch();
        },
    });

    const columns: ColumnDef<Objetive>[] = [
        {
            accessorKey: 'title',
            header: 'Title',
        },
        {
            accessorKey: 'description',
            header: 'Description',
        },
        {
            accessorKey: 'targetValue',
            header: 'Target Value',
        },
        {
            accessorKey: 'currentValue',
            header: 'Current Value',
        },
        {
            accessorKey: 'deadline',
            header: 'Deadline',
        },
        {
            accessorKey: 'status',
            header: 'Status',
        },
        // {
        //     header: 'Update progress',
        //     id: 'actions',
        //     cell: ({ row }) => {
        //         const objetiveRow = row.original;
        //         return (
        //             <Button
        //                 onClick={() => {
        //                     alert(`Action for ${objetiveRow.title}`);
        //                 }}
        //             >
        //                 Update progress
        //             </Button>
        //         );
        //     },
        // },
        // {
        //     header: 'Edit',
        //     id: 'actions',
        //     cell: ({ row }) => {
        //         const objetiveRow = row.original;
        //         return (
        //             <Button
        //                 onClick={() => {
        //                     alert(`Action for ${objetiveRow.title}`);
        //                 }}
        //             >
        //                 Edit
        //             </Button>
        //         );
        //     },
        // },
        // {
        //     header: 'Delete',
        //     id: 'actions',
        //     cell: ({ row }) => {
        //         const objetiveRow = row.original;
        //         return (
        //             <Button
        //                 onClick={() => {
        //                     alert(`Action for ${objetiveRow.title}`);
        //                 }}
        //             >
        //                 Delete
        //             </Button>
        //         );
        //     },
        // },
    ];

    if (isLoading) {
        return <div>Loading...</div>;
    }

    console.log(data);

    if (!data) {
        return <div>No data</div>;
    }

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
        <DashboardLayout>
            <Modal
                title="Objetive"
                description="Create a new objetive"
                isOpen={open}
                onOpenChange={setOpen}
            >
                <GenericForm
                    schema={objetiveSchema}
                    defaultValues={defaultValues}
                    onSubmit={onSubmit}
                />
            </Modal>
            <DataTable columns={columns} data={data} />
        </DashboardLayout>
    );
}
