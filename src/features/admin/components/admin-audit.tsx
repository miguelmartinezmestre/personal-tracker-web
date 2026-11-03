'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import type { FunctionReturnType } from 'convex/server';
import { useLocale, useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/data-table/components/table';
import type { DataTableFeatures } from '@/components/data-table/data-table-features';
import { usePaginatedList } from '@/components/data-table/hooks/use-paginated-list';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

type AuditEntry = FunctionReturnType<typeof api.admin.listAuditLogs>['page'][number];

const RESOURCE_TYPES = [
    'all',
    'user',
    'session',
    'invitation',
    'organization_member',
    'objective',
    'progress',
    'category',
] as const;

const SEVERITY_VARIANTS = {
    info: 'secondary',
    warning: 'outline',
    critical: 'destructive',
} as const;

export default function AdminAudit() {
    const t = useTranslations('Admin.audit');
    const locale = useLocale();
    const [resourceType, setResourceType] = useState<(typeof RESOURCE_TYPES)[number]>('all');
    const [organizationId, setOrganizationId] = useState<Id<'organization'> | null>(null);
    const formatDate = new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'medium' });

    const logs = usePaginatedList(api.admin.listAuditLogs, {
        resourceType: resourceType === 'all' ? undefined : resourceType,
        organizationId: organizationId ?? undefined,
    });

    const typeItems = RESOURCE_TYPES.map(type => ({ value: type, label: t(`types.${type}`) }));

    const columns: ColumnDef<DataTableFeatures, AuditEntry>[] = [
        {
            id: 'date',
            header: t('date'),
            cell: ({ row }) => formatDate.format(row.original.createdAt),
        },
        {
            id: 'action',
            header: t('action'),
            cell: ({ row }) => (
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={SEVERITY_VARIANTS[row.original.severity]}>
                        {t(`severities.${row.original.severity}`)}
                    </Badge>
                    <code className="text-xs">{row.original.action}</code>
                </div>
            ),
        },
        {
            id: 'who',
            header: t('who'),
            cell: ({ row }) => (
                <div className="text-xs">
                    <span className="block">{row.original.userName ?? '—'}</span>
                    {row.original.actorName ? (
                        <span className="text-muted-foreground block">
                            {t('by', { name: row.original.actorName })}
                        </span>
                    ) : null}
                </div>
            ),
        },
        {
            id: 'organization',
            header: t('organization'),
            cell: ({ row }) => {
                const entryOrganizationId = row.original.organizationId;

                return entryOrganizationId === null ? (
                    <span className="text-muted-foreground text-xs">{t('platform')}</span>
                ) : (
                    <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 font-mono text-xs"
                        onClick={() => setOrganizationId(entryOrganizationId)}
                    >
                        {entryOrganizationId.slice(0, 8)}
                    </Button>
                );
            },
        },
        {
            id: 'metadata',
            header: t('metadata'),
            cell: ({ row }) => (
                <code className="block max-w-xs text-xs whitespace-pre-wrap wrap-anywhere">
                    {row.original.metadata}
                </code>
            ),
        },
    ];

    return (
        <section className="space-y-4" data-testid="admin-audit">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-xl font-semibold">{t('title')}</h2>
                <div className="flex flex-wrap items-center gap-2">
                    {organizationId ? (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setOrganizationId(null)}
                            aria-label={t('clearOrganization')}
                        >
                            {t('organizationFilter', { id: organizationId.slice(0, 8) })}
                            <X aria-hidden />
                        </Button>
                    ) : null}
                    <Select
                        value={resourceType}
                        items={typeItems}
                        onValueChange={value => {
                            const type = RESOURCE_TYPES.find(option => option === value);

                            if (type) {
                                setResourceType(type);
                            }
                        }}
                    >
                        <SelectTrigger aria-label={t('type')} data-testid="admin-audit-type">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {typeItems.map(item => (
                                <SelectItem key={item.value} value={item.value}>
                                    {item.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <DataTable
                columns={columns}
                data={logs.data}
                columnClassNames={{ metadata: 'hidden lg:table-cell' }}
                isLoading={logs.isLoading}
                pagination={logs}
                emptyMessage={t('empty')}
            />
        </section>
    );
}
