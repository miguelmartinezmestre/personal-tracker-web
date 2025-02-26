import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router'
import { ColumnDef } from '@tanstack/react-table';
import { DashboardLayout } from '../../../components/dashboard-layout';
import { DataTable } from '../../../components/table';
import { getSessions } from '../../../services/sessions';
import { Session } from '../../../models/session';
export const Route = createFileRoute('/dashboard/sessions/')({
  component: RouteComponent,
})


function RouteComponent() {
  const { data, isLoading } = useQuery({
      queryKey: ['sessions'],
      queryFn: getSessions,
  });

  const columns: ColumnDef<Session>[] = [
      {
          accessorKey: 'userAgent',
          header: 'Dispositivo',
      },
      {
          accessorKey: 'createdAt',
          header: 'Fecha',
      },
  ];

  if (isLoading) {
      return <div>Loading...</div>;
  }

  if (!data) {
      return <div>No data</div>;
  }

  console.log(data);

  return (
      <DashboardLayout>
          <DataTable columns={columns} data={data} />
      </DashboardLayout>
  );
}
