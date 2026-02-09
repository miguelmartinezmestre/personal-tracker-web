import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ColumnDef } from "@tanstack/react-table";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { useRevokeSession } from "./user-sessions-table-actions";
import { Doc } from "@/convex/_generated/dataModel";


export function useUserSessionsTableColumns() {

    const t = useTranslations('Admin');
    const tCommon = useTranslations('Common');

    const { revokeSession, isRevokingSession } = useRevokeSession();


    const columns: ColumnDef<Doc<'session'>>[] = [
        {
            accessorKey: '_id',
            header: t('userSessions.columns.id'),
            cell: ({ row }) => (
                <span className="font-mono text-xs">{String(row.original._id)}</span>
            ),
        },
        {
            accessorKey: 'expiresAt',
            header: t('userSessions.columns.expires'),
            cell: ({ row }) => {
                const expiresAt = row.original.expiresAt;
                const expiresAtDate = new Date(expiresAt);
                const isExpired = expiresAtDate.getTime() < Date.now();
                return (
                    <div>
                        <div className={isExpired ? 'text-red-500' : ''}>
                            {format(expiresAtDate, 'PPp')}
                        </div>
                        {isExpired && (
                            <Badge className="mt-1 bg-red-500 text-white">
                                {tCommon('status.expired')}
                            </Badge>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'ipAddress',
            header: t('userSessions.columns.ip'),
            cell: ({ row }) => row.original.ipAddress || tCommon('status.na'),
        },
        {
            accessorKey: 'userAgent',
            header: t('userSessions.columns.userAgent'),
            cell: ({ row }) => (
                <span className="text-xs text-muted-foreground max-w-xs truncate block">
                    {row.original.userAgent || tCommon('status.na')}
                </span>
            ),
        },
        {
            header: t('userSessions.columns.actions'),
            id: 'actions',
            cell: ({ row }) => (
                <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => revokeSession({ sessionToken: row.original.token })}
                    disabled={isRevokingSession}
                    data-testid="session-terminate-button"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            ),
        },
    ];

    return columns;
}
