'use client';
import {
    Bell,
    FileText,
    Frame,
    Goal,
    Home,
    Trophy,
    Settings,
    Users,
    Activity,
    Tag,
    Mail,
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
import type { api } from '@/convex/_generated/api';
import type { FunctionReturnType } from 'convex/server';
import { isGlobalAdminRole } from '@shared/platform-roles';
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
        name: 'objectives',
        url: '/dashboard/objectives',
        icon: Goal,
    },
    {
        name: 'categories',
        url: '/dashboard/categories',
        icon: Tag,
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
        name: 'invitations',
        url: '/dashboard/invitations',
        icon: Mail,
    },
    {
        name: 'sessions',
        url: '/dashboard/sessions',
        icon: Frame,
    },
    {
        name: 'settings',
        url: '/dashboard/settings',
        icon: Settings,
    },
    {
        name: 'organizations',
        url: '/dashboard/organizations',
        icon: Users,
    },
];
const adminProjects: ProjectNavItem[] = [
    {
        name: 'users',
        url: '/dashboard/admin/users',
        icon: Users,
    },
    {
        name: 'adminSessions',
        url: '/dashboard/admin/sessions',
        icon: Activity,
    },
    {
        name: 'adminAudit',
        url: '/dashboard/admin/audit',
        icon: FileText,
    },
];
export function AppSidebar({ initialUser }: { initialUser: CurrentUser }) {
    const t = useTranslations('Sidebar');
    const pathname = usePathname();
    const { isMobile, setOpenMobile } = useSidebar();
    const user = initialUser;
    const isAdmin = isGlobalAdminRole(user.role);
    const projects = isAdmin ? [...baseProjects, ...adminProjects] : baseProjects;
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
                                const isActive = pathname === item.url;
                                return (
                                    <SidebarMenuItem key={item.name}>
                                        <SidebarMenuButton>
                                            <Link
                                                href={item.url}
                                                prefetch={false}
                                                className={cn(
                                                    'relative transition-all duration-200',
                                                    isActive
                                                        ? 'bg-accent text-accent-foreground font-medium'
                                                        : 'hover:bg-accent/50 hover:text-accent-foreground'
                                                )}
                                            >
                                                <item.icon
                                                    className={cn(
                                                        'h-4 w-4 transition-all',
                                                        isActive && 'text-primary'
                                                    )}
                                                />
                                                {t(item.name)}
                                            </Link>
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
