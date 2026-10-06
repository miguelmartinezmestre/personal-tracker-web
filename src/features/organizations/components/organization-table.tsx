'use client';

import { DataTable } from '@/components/data-table/components/table';
import {
    useOrganizations,
    useDeleteOrganization,
    type Organization,
} from '@/features/organizations/hooks/use-organizations';
import type { ColumnDef } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/data-table/data-table-features';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import EditOrganizationFormModal from '@/features/organizations/components/organization-form-edit-modal';
import { useTranslations } from 'next-intl';
import { DeleteConfirmationDialog } from '@/components/data-table/components/delete-confirmation-dialog';
import { toast } from 'sonner';
import {
    isOrganizationAdminRole,
    isOrganizationOwnerRole,
} from '@/features/organizations/types/roles';

export default function OrganizationsTable() {
    const t = useTranslations('Organizations');
    const common = useTranslations('Common');
    const organizations = useOrganizations();
    const deleteOrganization = useDeleteOrganization();

    const columns: ColumnDef<DataTableFeatures, Organization>[] = [
        {
            accessorKey: 'name',
            header: t('name'),
        },
        {
            accessorKey: 'description',
            header: t('tableDescription'),
        },
        {
            header: '',
            id: 'update-organization',
            cell: ({ row }) => {
                const organizationRow = row.original;
                if (organizationRow.isPersonal || !isOrganizationAdminRole(organizationRow.role)) {
                    return null;
                }

                return <EditOrganizationFormModal defaultValues={organizationRow} />;
            },
        },
        {
            header: '',
            id: 'delete',
            cell: ({ row }) => {
                const organizationRow = row.original;
                if (organizationRow.isPersonal || !isOrganizationOwnerRole(organizationRow.role)) {
                    return null;
                }

                return (
                    <DeleteConfirmationDialog
                        onConfirm={async () => {
                            try {
                                await deleteOrganization.mutateAsync({ id: organizationRow.id });
                                toast.success(t('toast.deletedSuccess'));
                            } catch {
                                toast.error(t('toast.deleteFailed'));
                            }
                        }}
                        title={t('confirm.deleteOrganization')}
                        description={t('confirm.deleteOrganizationDescription')}
                        confirmLabel={t('confirm.deleteConfirm')}
                        cancelLabel={t('confirm.cancel')}
                        isLoading={deleteOrganization.isPending}
                        trigger={
                            <Button
                                data-testid="organization-delete-button"
                                variant="destructive"
                                size="sm"
                            >
                                {t('deleteOrganization')}
                            </Button>
                        }
                    />
                );
            },
        },
        {
            header: '',
            id: 'go-to-activity',
            cell: ({ row }) => {
                const organizationId = row.original.id;
                const organizationSlug = row.original.slug;

                if (organizationId && organizationId !== organizationSlug) {
                    return (
                        <Link
                            href={`/dashboard/organizations/${organizationId}`}
                            prefetch={false}
                            data-testid="organization-detail-link"
                        >
                            {t('goToOrganization')}
                        </Link>
                    );
                }

                return null;
            },
        },
    ];

    let loadMoreButton = null;
    if (organizations.hasMore) {
        loadMoreButton = (
            <Button
                variant="outline"
                disabled={organizations.isFetching}
                onClick={organizations.loadMore}
            >
                {common('actions.loadMore')}
            </Button>
        );
    }

    return (
        <div data-testid="organizations-table">
            <DataTable
                isError={organizations.isError}
                onRetry={() => {
                    void organizations.refetch();
                }}
                columns={columns}
                data={organizations.data ?? []}
                isLoading={organizations.isLoading}
            />
            {loadMoreButton}
        </div>
    );
}
