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
} from '@/components/ui/sidebar';
import Link from 'next/link';
import type { Route } from 'next';
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { authClient } from '@/lib/auth-client';

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
    const authUser = useQuery(api.auth.getCurrentUser, {});
    const userRole = useQuery(api.users.getUserRole, {}, { enabled: !!authUser?._id });
    const { data: session } = authClient.useSession();

    // Determinar si el usuario es admin
    const isAdmin = useMemo(() => {
        if (!authUser?._id) return false;
        
        // 1. Intentar obtener el rol desde la sesión de better-auth
        const sessionRole = session?.user?.role;
        if (sessionRole === 'admin' || sessionRole === 'ADMIN' || 
            (Array.isArray(sessionRole) && (sessionRole.includes('admin') || sessionRole.includes('ADMIN')))) {
            return true;
        }
        
        // 2. Intentar obtener el rol desde el usuario de auth
        const authRole = (authUser as any)?.role;
        if (authRole === 'admin' || authRole === 'ADMIN' || 
            (Array.isArray(authRole) && (authRole.includes('admin') || authRole.includes('ADMIN')))) {
            return true;
        }

        // 3. Verificar el rol desde la query getUserRole
        const role = userRole?.role;
        if (role === 'admin' || role === 'ADMIN') {
            return true;
        }

        return false;
    }, [authUser, userRole, session]);

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
            <SidebarHeader>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup className="group-data-[collapsible=icon]:hidden">
                    <SidebarMenu>
                        {projects.map((item) => (
                            <SidebarMenuItem key={item.name}>
                                <SidebarMenuButton asChild>
                                    <Link href={item.url} prefetch={false}>
                                        <item.icon />
                                        {t(item.name)}
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild key="settings">
                                {/* <EditSettingsFormModal /> */}
                            </SidebarMenuButton>
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
