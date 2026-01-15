'use client';

import { Check, Building, Loader2 } from 'lucide-react';
import { Button } from '@repo/ui/components/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@repo/ui/components/dropdown-menu';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { authClient } from '@/features/auth/auth-client';
import { useTeams } from '@/features/organizations/hooks/use-teams';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';

export function OrganizationSwitcher() {
    const t = useTranslations('OrganizationSwitcher');
    const router = useRouter();
    const [isClient, setIsClient] = useState(false);

    // Get active organization using BetterAuth's hook
    const activeOrganizationQuery = authClient.useActiveOrganization();
    const activeOrganizationId = activeOrganizationQuery.data?.id as string | undefined;

    // Get all user's organizations
    const { data: teams, isLoading: isLoadingTeams } = useTeams();

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

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                        <Building className="h-4 w-4" />
                        <span className="sr-only">{t('label')}</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                        <span className="ml-2">{t('loading')}</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    const activeOrganization = teams?.find(t => t.id === activeOrganizationId);
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
                {isLoadingTeams ? (
                    <DropdownMenuItem disabled>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {t('loading')}
                    </DropdownMenuItem>
                ) : teams && teams.length > 0 ? (
                    teams.map(team => (
                        <DropdownMenuItem
                            key={team.id}
                            onClick={() => handleOrganizationChange(team.id)}
                            data-testid={`organization-option-${team.id}`}
                            className="flex items-center gap-3 cursor-pointer"
                        >
                            <span className="flex-1 truncate">{team.name}</span>
                            {team.id === activeOrganizationId && (
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
                    onClick={() => router.push('/dashboard/teams')}
                    className="flex items-center gap-3 cursor-pointer"
                >
                    <span className="flex-1">{t('manageTeams')}</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
