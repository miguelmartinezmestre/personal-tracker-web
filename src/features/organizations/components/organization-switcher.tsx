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
import { authClient } from '@/features/auth/auth-client';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { useActiveOrganization, useActiveMember } from '@/features/organizations/hooks/use-active-organization';
import { useOrganizations } from '@/features/organizations/hooks/use-organizations';
import { useSession } from '@/features/auth/hooks/use-session';

export function OrganizationSwitcher() {
    const t = useTranslations('OrganizationSwitcher');
    const router = useRouter();
    const activeOrganizationQuery = useActiveOrganization();
    const activeMemberQuery = useActiveMember();
    const organizationsQuery = useOrganizations();
    const sessionQuery = useSession();

    const sessionActiveOrganizationId =
        sessionQuery.data?.session?.activeOrganizationId ?? undefined;
    const activeOrganization = activeOrganizationQuery.data ?? null;
    const organizations = organizationsQuery.data ?? [];
    const activeOrganizationId =
        activeOrganization?.id ??
        activeMemberQuery.data?.organizationId ??
        sessionActiveOrganizationId;
    const isLoadingData =
        activeOrganizationQuery.isPending ||
        activeMemberQuery.isPending ||
        organizationsQuery.isPending;

    // Set active organization mutation
    const setActiveMutation = useMutation({
        mutationFn: async (organizationId: string) => {
            return await authClient.organization.setActive({
                organizationId,
            });
        },
        onSuccess: () => {
            // Refresh to update the session
            router.refresh();
        },
    });

    const activeOrganizationFromList = organizations.find(
        organization => organization.id === activeOrganizationId
    );
    const displayName =
        activeOrganization?.name || activeOrganizationFromList?.name || t('noOrganization');

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
                    className="w-9 justify-center px-0 sm:min-w-[140px] sm:w-auto sm:justify-start sm:px-3"
                    disabled={setActiveMutation.isPending || isLoadingData}
                >
                    {setActiveMutation.isPending || isLoadingData ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <>
                            <Building className="h-4 w-4 sm:mr-2" />
                            <span className="hidden truncate sm:inline">{displayName}</span>
                        </>
                    )}
                    <span className="sr-only">{t('label')}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                    {t('organizations')}
                </div>
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
                        >
                            <span className="flex-1 truncate">{organization.name}</span>
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
