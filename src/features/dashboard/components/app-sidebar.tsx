'use client';
import { Goal, Home, Mail, Users } from 'lucide-react';
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
import type { api } from '@/convex/_generated/api';
import type { FunctionReturnType } from 'convex/server';
type ProjectNavItem = {
    name: string;
    url: Route;
    icon: LucideIcon;
};
type CurrentUser = NonNullable<FunctionReturnType<typeof api.auth.getCurrentUser>>;
const baseProjects: ProjectNavItem[] = [
    {
        name: 'home',
        url: '/dashboard/home',
        icon: Home,
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
];
export function AppSidebar({ initialUser: _initialUser }: { initialUser: CurrentUser }) {
    const t = useTranslations('Sidebar');
    const pathname = usePathname();
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
                            {baseProjects.map(item => {
                                const isActive = pathname === item.url;
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
                                                        isActive
                                                            ? 'bg-accent text-accent-foreground font-medium'
                                                            : 'hover:bg-accent/50 hover:text-accent-foreground'
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
