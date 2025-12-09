'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { authClient } from '@/lib/auth-client';
import { DataTable } from '@/components/table';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@repo/ui/components/badge';
import { Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

type Session = {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date | number;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date | number;
};

export default function UserSessions() {
  const [userId, setUserId] = useState('');
  const queryClient = useQueryClient();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['user-sessions', userId],
    queryFn: async () => {
      if (!userId) return { sessions: [] };
      const result = await authClient.admin.listUserSessions({ userId });
      return result;
    },
    enabled: !!userId,
  });

  // Normalize the sessions data structure
  const sessionsList =
    sessions && 'data' in sessions && sessions.data
      ? sessions.data.sessions
      : sessions && 'sessions' in sessions
        ? sessions.sessions
        : [];

  const revokeSession = useMutation({
    mutationFn: async ({ sessionToken }: { sessionToken: string }) => {
      return await authClient.admin.revokeUserSession({ sessionToken });
    },
    onSuccess: () => {
      toast.success('Sesión revocada exitosamente');
      queryClient.invalidateQueries({ queryKey: ['user-sessions'] });
    },
    onError: (error: any) => {
      toast.error(`Error al revocar sesión: ${error.message}`);
    },
  });

  const revokeAllSessions = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      if (!confirm('¿Estás seguro de que quieres revocar todas las sesiones de este usuario?')) {
        return;
      }
      return await authClient.admin.revokeUserSessions({ userId });
    },
    onSuccess: () => {
      toast.success('Todas las sesiones revocadas exitosamente');
      queryClient.invalidateQueries({ queryKey: ['user-sessions'] });
    },
    onError: (error: any) => {
      toast.error(`Error al revocar sesiones: ${error.message}`);
    },
  });

  const columns: ColumnDef<Session>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.id.slice(0, 8)}...</span>,
    },
    {
      accessorKey: 'expiresAt',
      header: 'Expira',
      cell: ({ row }) => {
        const expiresAt = row.original.expiresAt;
        const expiresAtDate = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
        const isExpired = expiresAtDate.getTime() < Date.now();
        return (
          <div>
            <div className={isExpired ? 'text-red-500' : ''}>
              {format(expiresAtDate, 'PPp')}
            </div>
            {isExpired && <Badge variant="destructive" className="mt-1">Expirada</Badge>}
          </div>
        );
      },
    },
    {
      accessorKey: 'ipAddress',
      header: 'IP',
      cell: ({ row }) => row.original.ipAddress || 'N/A',
    },
    {
      accessorKey: 'userAgent',
      header: 'User Agent',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground max-w-xs truncate block">
          {row.original.userAgent || 'N/A'}
        </span>
      ),
    },
    {
      header: 'Acciones',
      id: 'actions',
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="destructive"
          onClick={() => revokeSession.mutate({ sessionToken: row.original.token })}
          disabled={revokeSession.isPending}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="ID del usuario para ver sus sesiones..."
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="flex-1"
        />
        {userId && (
          <Button
            variant="destructive"
            onClick={() => revokeAllSessions.mutate({ userId })}
            disabled={revokeAllSessions.isPending}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Revocar Todas
          </Button>
        )}
      </div>
      {userId ? (
        <>
          <DataTable
            columns={columns}
            data={sessionsList}
            isLoading={isLoading}
          />
          {sessionsList.length === 0 && !isLoading && (
            <p className="text-center text-muted-foreground py-8">
              No se encontraron sesiones para este usuario
            </p>
          )}
        </>
      ) : (
        <p className="text-center text-muted-foreground py-8">
          Ingresa un ID de usuario para ver sus sesiones
        </p>
      )}
    </div>
  );
}

