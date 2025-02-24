import { useQuery, useMutation } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router'
import { ColumnDef } from '@tanstack/react-table';
import { useState } from 'react';
import { z } from 'zod';
import { DashboardLayout } from '../../../components/dashboard-layout';
import { GenericForm } from '../../../components/generic-form';
import { Modal } from '../../../components/modal';
import { DataTable } from '../../../components/table';
import { Button } from '../../../components/ui/button';
import useAuth from '../../../hooks/useAuth';
import { Objetive } from '../../../models/objetive';
import { getObjectives, createObjective, updateObjective } from '../../../services/objetives';

export const Route = createFileRoute('/dashboard/objetives/')({
  component: RouteComponent,
})


const defaultValues = {
  title: 'a',
  description: 'a',
  category: 'a',
  targetValue: 0,
  currentValue: 0,
  deadline: new Date(),
  status: 'aa',
  unit: 'a',
};

const objetiveSchema = z.object({
  id: z.number().optional(),
  title: z.string().min(1, { message: 'Title is required' }),
  description: z.string().min(1, { message: 'Description is required' }),
  category: z.string().min(1, { message: 'Category is required' }),
  targetValue: z.number().min(1, { message: 'Target value is required' }),
  currentValue: z.number().min(1, { message: 'Current value is required' }),
  deadline: z.date(),
  status: z.string().min(1, { message: 'Status is required' }),
  unit: z.string().min(1, { message: 'Unit is required' }),
});

function RouteComponent() {
  const auth = useAuth();
  const [, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [updateValues, setUpdateValues] = useState<z.infer<typeof objetiveSchema>>(defaultValues);

  const { data, refetch, isLoading } = useQuery({
      queryKey: ['objetives'],
      queryFn: () => getObjectives(auth.id),
  });

  const mutation = useMutation({
      mutationFn: (values: z.infer<typeof objetiveSchema>) => {
          console.log(values);
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

  const updateMutation = useMutation({
      mutationFn: (values: z.infer<typeof objetiveSchema>) => {
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
              userId: auth ? Number(auth.id) : -1,
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

  const columns: ColumnDef<Objetive>[] = [
      {
          accessorKey: 'title',
          header: 'Titulo',
      },
      {
          accessorKey: 'description',
          header: 'Descripción',
      },
      {
          accessorKey: 'targetValue',
          header: 'Valor Objetivo',
      },
      {
          accessorKey: 'currentValue',
          header: 'Valor Actual',
      },
      {
          accessorKey: 'deadline',
          header: 'Fecha Limite',
      },
      {
          accessorKey: 'status',
          header: 'Estado',
      },
      {
          header: 'Update progress',
          id: 'update-progress',
          cell: ({ row }) => {
              const objetiveRow = row.original;
              return (
                  <Button
                      onClick={() => {
                          setUpdateOpen(true);
                          setUpdateValues(objetiveRow);
                      }}
                  >
                      Update progress
                  </Button>
              );
          },
      },
      {
          header: 'Ir actividad',
          id: 'go-to-activity',
          cell: ({ row }) => {
              const objetiveRow = row.original;
              if (objetiveRow.id) {
                  return (
                      <Link to='/dashboard/objetives/$id' params={{ id: String(objetiveRow.id) }}>
                          Ir actividad
                      </Link>
                  );
              }

              return null;
                  
          },
      },
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

  function onSubmit(values: z.infer<typeof objetiveSchema>) {
      console.log(JSON.stringify(values, null, 2));
      mutation.mutate(values);
  }

  function onUpdateSubmit(values: z.infer<typeof objetiveSchema>) {
      console.log(JSON.stringify(values, null, 2));
      updateMutation.mutate(values);
  }

  return (
      <DashboardLayout>
          <Modal
              title="Update progress"
              description="Update the progress of the objetive"
              isOpen={updateOpen}
              onOpenChange={setUpdateOpen}
              buttonHidden={true}
          >
              <GenericForm
                  schema={objetiveSchema}
                  defaultValues={updateValues}
                  onSubmit={onUpdateSubmit}
              />
          </Modal>

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

