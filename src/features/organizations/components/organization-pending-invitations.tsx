'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table/components/table';
import { DeleteConfirmationDialog } from '@/components/data-table/components/delete-confirmation-dialog';
import type { DataTableFeatures } from '@/components/data-table/data-table-features';
import { getErrorLocale, resolveErrorMessage } from '@/lib/error-messages';
import type { Id } from '@/convex/_generated/dataModel';
import {
    useCancelInvitation,
    usePendingOrganizationInvitations,
} from '@/features/organizations/hooks/use-invitations';
import { isOrganizationRoleValue } from '@/features/organizations/types/roles';

type PendingInvitation = {
    id: string;
    email: string;
    role: string;
    expiresAt: number;
};

export default function OrganizationPendingInvitations({
    organizationId,
}: {
    organizationId: Id<'organization'>;
}) {
    const t = useTranslations('OrganizationMembers');
    const locale = useLocale();
    const invitations = usePendingOrganizationInvitations(organizationId);
    const cancelInvitation = useCancelInvitation();
    const formatDate = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' });

    const columns: ColumnDef<DataTableFeatures, PendingInvitation>[] = [
        { accessorKey: 'email', header: t('email') },
        {
            accessorKey: 'role',
            header: t('role'),
            cell: ({ row }) =>
                isOrganizationRoleValue(row.original.role)
                    ? t(`roles.${row.original.role}`)
                    : row.original.role,
        },
        {
            accessorKey: 'expiresAt',
            header: t('pendingInvitations.expires'),
            cell: ({ row }) => formatDate.format(new Date(row.original.expiresAt)),
        },
        {
            id: 'cancel',
            header: () => <span className="sr-only">{t('pendingInvitations.cancel')}</span>,
            cell: ({ row }) => (
                <div className="flex justify-end">
                    <DeleteConfirmationDialog
                        title={t('pendingInvitations.cancelConfirmTitle', {
                            email: row.original.email,
                        })}
                        description={t('pendingInvitations.cancelConfirmDescription')}
                        confirmLabel={t('pendingInvitations.cancel')}
                        cancelLabel={t('pendingInvitations.keep')}
                        isLoading={cancelInvitation.isPending}
                        trigger={
                            <Button
                                variant="outline"
                                size="sm"
                                aria-label={t('pendingInvitations.cancelFor', {
                                    email: row.original.email,
                                })}
                                data-testid="organization-invitation-cancel"
                            >
                                {t('pendingInvitations.cancel')}
                            </Button>
                        }
                        onConfirm={async () => {
                            try {
                                await cancelInvitation.mutateAsync(row.original.id);
                                toast.success(t('pendingInvitations.canceled'));
                            } catch (error) {
                                toast.error(resolveErrorMessage(error, getErrorLocale()));
                            }
                        }}
                    />
                </div>
            ),
        },
    ];

    return (
        <section
            className="space-y-3"
            aria-labelledby="organization-invitations-heading"
            data-testid="organization-pending-invitations"
        >
            <h2 id="organization-invitations-heading" className="text-xl font-semibold">
                {t('pendingInvitations.title')}
            </h2>
            <DataTable
                columns={columns}
                data={invitations.data}
                isLoading={invitations.isLoading}
                pagination={invitations}
                emptyMessage={t('pendingInvitations.empty')}
            />
        </section>
    );
}
