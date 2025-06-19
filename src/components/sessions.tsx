// "use client"

// import { ColumnDef } from '@tanstack/react-table';
// import { Session } from '../models/session';
// import { useState } from 'react';
// import { useAuthContext } from '../src/providers/auth-provider';
// import { useInvalidateSessionMutation } from '../services/mutations/sessions';
// import { useSessionsQuery } from '../services/queries/sessions';
// import { DataTable } from './table';
// import { Button } from '@/components/ui/button';
// import { UserAgentIcon } from './user-agent';

// export default function Sessions() {
//     const { user, isLoading: isLoadingAuth } = useAuthContext();

//     const { data, isLoading, refetch } = useSessionsQuery(user.id);

//     const [, setError] = useState('');
//     const [, setOpen] = useState(false);

//     const { mutation } = useInvalidateSessionMutation(setError, setOpen, refetch);

//     const columns: ColumnDef<Session>[] = [
//         {
//             accessorKey: 'userAgent',
//             header: 'Dispositivo',
//             cell: ({ row }) => {
//                 return <UserAgentIcon userAgent={row.original.userAgent} />;
//             },
//         },
//         {
//             accessorKey: 'createdAt',
//             header: 'Fecha',
//         },
//         {
//             accessorKey: 'status',
//             header: 'Estado',
//         },
//         {
//             header: '',
//             id: 'close-session',
//             cell: ({ row }) => {
//                 const objetiveRow = row.original;
//                 if (objetiveRow.status === 'active') {
//                     return (
//                         <Button
//                             onClick={() => {
//                                 mutation.mutate(objetiveRow.id);
//                             }}
//                         >
//                             Cerrar sesion
//                         </Button>
//                     );
//                 }
//                 return null;
//             },
//         },
//     ];

//     if (isLoading || isLoadingAuth) {
//         return <div>Loading...</div>;
//     }

//     if (!data) {
//         return <div>No data</div>;
//     }

//     return (
//         <>
//             <DataTable columns={columns} data={data} />
//         </>
//     );
// }
