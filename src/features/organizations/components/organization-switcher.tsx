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
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';

export function OrganizationSwitcher() {
    const t = useTranslations('OrganizationSwitcher');
    const router = useRouter();
    const queryClient = useQueryClient();
    const [{data: activeOrganizationData}, {data: organizationsData, isPending: isLoadingOrganizations}] = useQueries({
        queries: [
        {
            queryKey: ['activeOrganization'],
            queryFn: async () => {
                const result = await authClient.organization.getActiveMember();
                return result.data;
            },
        },
        {
            queryKey: ['organizations'],
            queryFn: async () => {
                const result = await authClient.organization.list();
                return result.data;
            },
        },
    ]});

    const activeOrganizationId = activeOrganizationData?.organizationId as string | undefined;
    const organizations = organizationsData;

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
            queryClient.invalidateQueries({ queryKey: ['activeOrganization'] });
            queryClient.invalidateQueries({ queryKey: ['organizations'] });
        },
    });

    const activeOrganization = organizations?.find(
        organization => organization.id === activeOrganizationId
    );
    const displayName = activeOrganization?.name || t('noOrganization');

    const handleOrganizationChange = (organizationId: string) => {
        setActiveMutation.mutate(organizationId);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    data-testid="organization-switcher"
                    className="min-w-[140px] justify-start"
                    disabled={setActiveMutation.isPending}
                >
                    {setActiveMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <>
                            <Building className="h-4 w-4 mr-2" />
                            <span className="truncate">{displayName}</span>
                        </>
                    )}
                    <span className="sr-only">{t('label')}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                    {t('organizations')}
                </div>
                {isLoadingOrganizations ? (
                    <DropdownMenuItem disabled>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {t('loading')}
                    </DropdownMenuItem>
                ) : organizations && organizations.length > 0 ? (
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
