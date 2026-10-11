'use client';

import { Check, Building, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useTranslations } from 'next-intl';
import { authClient } from '@/features/auth/client';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
    useOrganizations,
    useOrganizationByIdentifier,
    type Organization,
} from '@/features/organizations/hooks/use-organizations';
import { throwIfAuthClientError } from '@/features/auth/auth-client-response';
import { useState } from 'react';
import { api } from '@/convex/_generated/api';
import { convexQuery } from '@convex-dev/react-query';

function OrganizationSwitcherMenuItems({
    isLoadingData,
    organizations,
    activeOrganizationId,
    loadingLabel,
    emptyLabel,
    personalLabel,
    personalOrganizationName,
    currentLabel,
    onSelect,
}: {
    isLoadingData: boolean;
    organizations: Pick<Organization, 'id' | 'name' | 'isPersonal'>[];
    activeOrganizationId: string | null;
    loadingLabel: string;
    emptyLabel: string;
    personalLabel: string;
    personalOrganizationName: string;
    currentLabel: string;
    onSelect: (organizationId: string) => void;
}) {
    if (isLoadingData) {
        return (
            <DropdownMenuItem disabled>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {loadingLabel}
            </DropdownMenuItem>
        );
    }

    if (organizations.length === 0) {
        return (
            <DropdownMenuItem disabled>
                <span className="text-muted-foreground">{emptyLabel}</span>
            </DropdownMenuItem>
        );
    }

    return organizations.map(organization => {
        let personalBadge = null;
        if (organization.isPersonal) {
            personalBadge = (
                <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    {personalLabel}
                </span>
            );
        }
        let currentLabelElement = null;
        let currentCheck = null;
        if (organization.id === activeOrganizationId) {
            currentLabelElement = (
                <span className="text-xs text-primary font-medium">{currentLabel}</span>
            );
            currentCheck = <Check className="h-4 w-4 text-primary flex-shrink-0" />;
        }
        return (
            <DropdownMenuItem
                key={organization.id}
                onClick={() => onSelect(organization.id)}
                data-testid={`organization-option-${organization.id}`}
                className="flex items-center gap-3 cursor-pointer"
                disabled={organization.id === activeOrganizationId}
            >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                    <Building className="h-3 w-3" />
                </div>
                <span className="flex-1 truncate">
                    {organization.isPersonal ? personalOrganizationName : organization.name}
                </span>
                {personalBadge}
                {currentLabelElement}
                {currentCheck}
            </DropdownMenuItem>
        );
    });
}

// Personal organizations cannot be renamed, so their stored name is always the default one.
function organizationDisplayName(
    organization: Pick<Organization, 'name' | 'isPersonal'> | null | undefined,
    labels: { personal: string; none: string }
): string {
    if (organization?.isPersonal) {
        return labels.personal;
    }
    return organization?.name || labels.none;
}

interface OrganizationSwitcherProps {
    initialActiveOrganizationId: string | null;
}

export function OrganizationSwitcher({ initialActiveOrganizationId }: OrganizationSwitcherProps) {
    const t = useTranslations('OrganizationSwitcher');
    const common = useTranslations('Common');
    const router = useRouter();
    const organizationsQuery = useOrganizations();
    const sessionQuery = useQuery(convexQuery(api.organizations.getCurrentSession, {}));
    const [optimisticOrganizationId, setOptimisticOrganizationId] = useState<string | null>(null);
    const sessionActiveOrganizationId = sessionQuery.data?.session.activeOrganizationId ?? null;
    const activeOrganizationId =
        optimisticOrganizationId ??
        (sessionQuery.data ? sessionActiveOrganizationId : initialActiveOrganizationId);
    const activeQuery = useOrganizationByIdentifier(activeOrganizationId ?? '');
    const organizations = organizationsQuery.isError ? [] : (organizationsQuery.data ?? []);
    const isLoadingData = organizationsQuery.isPending;

    const setActiveMutation = useMutation({
        mutationFn: async (organizationId: string) => {
            const result = await authClient.organization.setActive({
                organizationId,
            });
            throwIfAuthClientError(result);
            return result.data;
        },
        onSuccess: (_data, organizationId) => {
            setOptimisticOrganizationId(organizationId);
            router.refresh();
        },
    });

    const activeOrganization =
        organizations.find(organization => organization.id === activeOrganizationId) ??
        activeQuery.data;
    const displayName = organizationDisplayName(activeOrganization, {
        personal: t('personalOrganizationName'),
        none: t('noOrganization'),
    });
    const activeIsPersonal = Boolean(activeOrganization?.isPersonal);

    const handleOrganizationChange = (organizationId: string) => {
        if (!organizationId || organizationId === activeOrganizationId) {
            return;
        }
        setActiveMutation.mutate(organizationId);
    };

    let triggerContent;
    if (setActiveMutation.isPending || isLoadingData) {
        triggerContent = <Loader2 className="h-4 w-4 animate-spin" />;
    } else {
        triggerContent = (
            <>
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Building className="h-3 w-3 text-primary" />
                </div>
                <span className="hidden min-w-0 truncate font-medium sm:inline" aria-hidden>
                    {displayName}
                </span>
                <div
                    className="ml-1 hidden h-2 w-2 shrink-0 rounded-full bg-green-500 sm:block"
                    aria-hidden
                />
            </>
        );
    }

    let personalBadge = null;
    if (activeIsPersonal) {
        personalBadge = (
            <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                {t('personal')}
            </span>
        );
    }

    let retryItem = null;
    if (organizationsQuery.isError) {
        retryItem = (
            <DropdownMenuItem
                closeOnClick={false}
                onClick={() => {
                    void organizationsQuery.refetch();
                }}
            >
                {common('actions.retry')}
            </DropdownMenuItem>
        );
    }

    let loadMoreItem = null;
    if (organizationsQuery.hasMore) {
        loadMoreItem = (
            <DropdownMenuItem
                disabled={organizationsQuery.isFetching}
                closeOnClick={false}
                onClick={() => {
                    organizationsQuery.loadMore();
                }}
            >
                {common('actions.loadMore')}
            </DropdownMenuItem>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button
                        variant="outline"
                        data-testid="organization-switcher"
                        className="h-9 w-9 min-w-0 justify-center gap-2 border-2 border-primary/20 bg-primary/5 px-0 hover:bg-primary/10 hover:border-primary/30 sm:w-auto sm:min-w-[140px] sm:max-w-[18rem] sm:justify-start sm:px-3"
                        disabled={setActiveMutation.isPending || isLoadingData}
                    >
                        {triggerContent}
                        <span className="sr-only">{t('triggerLabel', { name: displayName })}</span>
                    </Button>
                }
            />
            <DropdownMenuContent align="end" className="w-72">
                <div className="border-b px-3 py-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {t('activeOrganization')}
                    </p>
                    <p className="mt-1 flex items-center gap-2 truncate text-sm font-semibold">
                        <span className="truncate">{displayName}</span>
                        {personalBadge}
                    </p>
                </div>
                <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
                    {t('switchOrganization')}
                </div>
                <div className="max-h-60 overflow-y-auto">
                    <OrganizationSwitcherMenuItems
                        isLoadingData={isLoadingData}
                        organizations={organizations}
                        activeOrganizationId={activeOrganizationId}
                        loadingLabel={t('loading')}
                        emptyLabel={
                            organizationsQuery.isError ? common('queryError') : t('noOrganizations')
                        }
                        personalLabel={t('personal')}
                        personalOrganizationName={t('personalOrganizationName')}
                        currentLabel={t('current')}
                        onSelect={handleOrganizationChange}
                    />
                </div>
                {retryItem}
                {loadMoreItem}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    onClick={() => router.push('/dashboard/organizations')}
                    className="flex items-center gap-3 cursor-pointer"
                >
                    <span className="flex-1">{t('manageOrganizations')}</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
