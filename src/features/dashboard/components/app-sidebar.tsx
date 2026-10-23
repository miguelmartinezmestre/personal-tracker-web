'use client';

import {
    Goal,
    Home,
    Mail,
    MonitorSmartphone,
    Settings,
    ShieldCheck,
    Target,
    Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import type { Route } from 'next';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import { isGlobalAdminRole } from '@/convex/features/auth/roles';

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
        icon: Target,
    },
    {
        name: 'invitations',
        url: '/dashboard/invitations',
        icon: Mail,
    },
    {
        name: 'organizations',
        url: '/dashboard/organizations',
        icon: Users,
    },
    {
        name: 'sessions',
        url: '/dashboard/sessions',
        icon: MonitorSmartphone,
    },
    {
        name: 'settings',
        url: '/dashboard/settings',
        icon: Settings,
    },
];

// Only the global admin sees the administration entry (REQ-ROLES-002).
const adminProject: ProjectNavItem = { name: 'admin', url: '/dashboard/admin', icon: ShieldCheck };

export function AppSidebar() {
    const t = useTranslations('Sidebar');
    const pathname = usePathname();
    const user = useQuery(convexQuery(api.auth.getCurrentUser, {}));

    const projects = isGlobalAdminRole(user.data?.role)
        ? [...baseProjects, adminProject]
        : baseProjects;

    const { isMobile, setOpenMobile } = useSidebar();
    useEffect(() => {
        if (isMobile) {
            setOpenMobile(false);
        }
    }, [pathname, isMobile, setOpenMobile]);

    return (
        <Sidebar data-testid="app-sidebar">
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
                    <nav aria-label={t('navigationLabel')}>
                        <SidebarMenu data-testid="sidebar-menu">
                            {projects.map(item => {
                                let isActive: boolean;

                                if (item.url === '/dashboard/objectives') {
                                    isActive =
                                        pathname === item.url ||
                                        pathname.startsWith(`${item.url}/`);
                                } else {
                                    isActive = pathname === item.url;
                                }

                                return (
                                    <SidebarMenuItem key={item.name}>
                                        <SidebarMenuButton
                                            render={
                                                <Link
                                                    href={item.url}
                                                    prefetch={false}
                                                    data-testid={`sidebar-nav-${item.name}`}
                                                    className={cn(
                                                        'relative transition-all duration-200',
                                                        isActive &&
                                                            'bg-accent text-accent-foreground font-medium',
                                                        !isActive &&
                                                            'hover:bg-accent/50 hover:text-accent-foreground'
                                                    )}
                                                />
                                            }
                                        >
                                            <item.icon
                                                className={cn(
                                                    'h-4 w-4 transition-all',
                                                    isActive && 'text-primary'
                                                )}
                                            />
                                            {t(item.name)}
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </nav>
                </SidebarGroup>
            </SidebarContent>
        </Sidebar>
    );
}
