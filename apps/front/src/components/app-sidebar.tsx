'use client';

import { Bell, Frame, Goal, Home, Shield, Trophy, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@repo/ui/components/sidebar';
import Link from 'next/link';
import type { Route } from 'next';
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useUser } from '@/contexts/user-context';
import { useUserRole } from '@/hooks/use-user-role';
import AccountSettingsFormModal from '@/components/settings/account-settings-modal';
import { usePathname } from 'next/navigation';
import { cn } from '@repo/ui/lib/utils';

type ProjectNavItem = {
    name: string;
    url: Route;
    icon: LucideIcon;
};

const baseProjects: ProjectNavItem[] = [
    {
        name: 'home',
        url: '/dashboard/home',
        icon: Home,
    },
    {
        name: 'objectives',
        url: '/dashboard/objectives',
        icon: Goal,
    },
    {
        name: 'achievements',
        url: '/dashboard/achievements',
        icon: Trophy,
    },
    {
        name: 'notifications',
        url: '/dashboard/notifications',
        icon: Bell,
    },
    {
        name: 'sessions',
        url: '/dashboard/sessions',
        icon: Frame,
    },
];

// Helper to check if a role is admin
function isAdminRole(role: string | string[] | undefined): boolean {
    if (!role) return false;
    if (role === 'admin') return true;
    if (Array.isArray(role)) {
        return role.includes('admin');
    }
    return false;
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const t = useTranslations('Sidebar');
    const pathname = usePathname();

    // Use context user first (more efficient), fallback to useUserRole if needed
    let user: ReturnType<typeof useUser> | null = null;
    let isAdmin = false;
    try {
        user = useUser();
        // User is authenticated if we have context user
        isAdmin = isAdminRole((user as { role?: string | string[] })?.role);
    } catch {
        // Fallback to useUserRole if context not available (shouldn't happen in dashboard)
        const userRole = useUserRole();
        isAdmin = userRole.isAdmin;
    }

    // Construir la lista de proyectos incluyendo admin si es necesario
    const projects = useMemo(() => {
        const items = [...baseProjects];
        if (isAdmin) {
            items.push({
                name: 'admin',
                url: '/dashboard/admin-panel' as Route,
                icon: Shield,
            });
        }
        return items;
    }, [isAdmin]);

    return (
        <Sidebar collapsible="icon" data-testid="app-sidebar" {...props}>
            <SidebarHeader>
                <div className="flex items-center gap-2 px-2 py-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                        <Goal className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-semibold text-lg group-data-[collapsible=icon]:hidden">
                        {t('appName', { defaultValue: 'Metrics App' })}
                    </span>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup className="group-data-[collapsible=icon]:hidden">
                    <SidebarMenu data-testid="sidebar-menu">
                        {projects.map(item => {
                            const isActive = pathname === item.url;
                            return (
                                <SidebarMenuItem key={item.name}>
                                    <SidebarMenuButton asChild>
                                        <Link
                                            href={item.url}
                                            prefetch={false}
                                            className={cn(
                                                "relative transition-all duration-200",
                                                isActive
                                                    ? "bg-accent text-accent-foreground font-medium"
                                                    : "hover:bg-accent/50 hover:text-accent-foreground"
                                            )}
                                        >
                                            <item.icon className={cn(
                                                "h-4 w-4 transition-all",
                                                isActive && "text-primary"
                                            )} />
                                            {t(item.name)}
                                            {isActive && (
                                                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-primary" />
                                            )}
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            );
                        })}
                        {/* User is always authenticated here (inside AuthenticatedView) */}
                        <SidebarMenuItem key="settings">
                            <AccountSettingsFormModal />
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
                {/* <NavUser
                    user={{
                        email: accountDetails.data?.email,
                        name: accountDetails.data?.username,
                        avatar: '',
                    }}
                /> */}
            </SidebarFooter>
        </Sidebar>
    );
}
