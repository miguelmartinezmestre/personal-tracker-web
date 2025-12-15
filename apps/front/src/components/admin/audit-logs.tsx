'use client';

import { DataTable } from '@/components/table';
import { useSuspenseQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@repo/backend/convex/_generated/api';
import { Doc } from '@repo/backend/convex/_generated/dataModel';
import { format } from 'date-fns';
import { useRequireAdmin } from '@/hooks/use-user-role';
import { ShieldAlert } from 'lucide-react';

export function AuditLogs() {
    // Verify admin role
    try {
        useRequireAdmin();
    } catch (error) {
        return (
            <div className="rounded-md border border-red-200 bg-red-50 p-6">
                <div className="flex items-center gap-3">
                    <ShieldAlert className="h-5 w-5 text-red-600" />
                    <div>
                        <h3 className="font-semibold text-red-800">Acceso Denegado</h3>
                        <p className="text-sm text-red-600">
                            No tienes permisos de administrador para acceder a esta función.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const logs = useSuspenseQuery(convexQuery(api.auditLogs.getAuditLogs, {}));

    const columns: ColumnDef<Doc<'auditLogs'>>[] = [
        {
            accessorKey: 'user',
            header: 'Usuario ID',
            cell: ({ row }) => {
                const userId = row.original.user;
                return <span className="font-mono text-xs">{userId}</span>;
            },
        },
        {
            accessorKey: 'action',
            header: 'Acción',
            cell: ({ row }) => {
                const action = row.original.action;
                return <span className="font-medium">{action}</span>;
            },
        },
        {
            accessorKey: 'createdAt',
            header: 'Fecha',
            cell: ({ row }) => {
                const date = row.original.createdAt;
                return format(new Date(date), 'PPp');
            },
        },
    ];

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-lg font-semibold mb-2">Logs de Auditoría</h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Registro de acciones realizadas en el sistema
                </p>
            </div>
            <DataTable columns={columns} data={logs.data || []} isLoading={logs.isLoading} />
            {logs.data && logs.data.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                    No hay logs de auditoría registrados
                </p>
            )}
        </div>
    );
}
