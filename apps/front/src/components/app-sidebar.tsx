'use client';

import { Bell, Frame, Goal, Home, Shield } from 'lucide-react';
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
import { useUserRole } from '@/hooks/use-user-role';
import AccountSettingsFormModal from '@/components/settings/account-settings-modal';

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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const t = useTranslations('Sidebar');
    const { isAdmin, isAuthenticated } = useUserRole();

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
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader></SidebarHeader>
            <SidebarContent>
                <SidebarGroup className="group-data-[collapsible=icon]:hidden">
                    <SidebarMenu>
                        {projects.map(item => (
                            <SidebarMenuItem key={item.name}>
                                <SidebarMenuButton asChild>
                                    <Link href={item.url} prefetch={false}>
                                        <item.icon />
                                        {t(item.name)}
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                        {isAuthenticated && (
                            <SidebarMenuItem key="settings">
                                <AccountSettingsFormModal />
                            </SidebarMenuItem>
                        )}
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
