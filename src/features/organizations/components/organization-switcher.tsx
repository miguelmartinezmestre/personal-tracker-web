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
import { useMutation } from '@tanstack/react-query';
import { useOrganizations } from '@/features/organizations/hooks/use-organizations';
import { throwIfAuthClientError } from '@/features/auth/auth-client-response';
import { useState } from 'react';

interface OrganizationSwitcherProps {
    initialActiveOrganizationId: string | null;
}

export function OrganizationSwitcher({ initialActiveOrganizationId }: OrganizationSwitcherProps) {
    const t = useTranslations('OrganizationSwitcher');
    const router = useRouter();
    const organizationsQuery = useOrganizations();
    const [activeOrganizationId, setActiveOrganizationId] = useState<string | null>(
        initialActiveOrganizationId
    );
    const organizations = organizationsQuery.data ?? [];
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
            setActiveOrganizationId(organizationId);
            router.refresh();
        },
    });

    const activeOrganization = organizations.find(
        organization => organization.id === activeOrganizationId
    );
    const displayName = activeOrganization?.name || t('noOrganization');
    const activeIsPersonal = Boolean(activeOrganization?.isPersonal);

    const handleOrganizationChange = (organizationId: string) => {
        if (!organizationId || organizationId === activeOrganizationId) {
            return;
        }
        setActiveMutation.mutate(organizationId);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    data-testid="organization-switcher"
                    className="h-9 w-9 min-w-0 justify-center gap-2 border-2 border-primary/20 bg-primary/5 px-0 hover:bg-primary/10 hover:border-primary/30 sm:w-auto sm:min-w-[140px] sm:max-w-[18rem] sm:justify-start sm:px-3"
                    disabled={setActiveMutation.isPending || isLoadingData}
                >
                    {setActiveMutation.isPending || isLoadingData ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <>
                            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                                <Building className="h-3 w-3 text-primary" />
                            </div>
                            <span className="hidden min-w-0 truncate font-medium sm:inline">
                                {displayName}
                            </span>
                            <div
                                className="ml-1 hidden h-2 w-2 shrink-0 rounded-full bg-green-500 sm:block"
                                title={t('activeOrganization')}
                            />
                        </>
                    )}
                    <span className="sr-only">{t('label')}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
                <div className="border-b px-3 py-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {t('activeOrganization')}
                    </p>
                    <p className="mt-1 flex items-center gap-2 truncate text-sm font-semibold">
                        <span className="truncate">{displayName}</span>
                        {activeIsPersonal ? (
                            <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                {t('personal')}
                            </span>
                        ) : null}
                    </p>
                </div>
                <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
                    {t('switchOrganization')}
                </div>
                <div className="max-h-60 overflow-y-auto">
                    {isLoadingData ? (
                        <DropdownMenuItem disabled>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            {t('loading')}
                        </DropdownMenuItem>
                    ) : organizations.length > 0 ? (
                        organizations.map(organization => (
                            <DropdownMenuItem
                                key={organization.id}
                                onClick={() => handleOrganizationChange(organization.id)}
                                data-testid={`organization-option-${organization.id}`}
                                className="flex items-center gap-3 cursor-pointer"
                                disabled={organization.id === activeOrganizationId}
                            >
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                                    <Building className="h-3 w-3" />
                                </div>
                                <span className="flex-1 truncate">{organization.name}</span>
                                {organization.isPersonal ? (
                                    <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                        {t('personal')}
                                    </span>
                                ) : null}
                                {organization.id === activeOrganizationId ? (
                                    <span className="text-xs text-primary font-medium">
                                        {t('current')}
                                    </span>
                                ) : null}
                                {organization.id === activeOrganizationId && (
                                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                                )}
                            </DropdownMenuItem>
                        ))
                    ) : (
                        <DropdownMenuItem disabled>
                            <span className="text-muted-foreground">{t('noOrganizations')}</span>
                        </DropdownMenuItem>
                    )}
                </div>
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
