'use client';

import { Bell, Frame, Goal, Home, Loader2, Users } from 'lucide-react';
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
import { NavUser } from '@/components/nav-user';
import EditSettingsFormModal from '@/components/settings/account-settings-modal';
import Link from 'next/link';
import { useTRPC } from '@/trpc/client';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

const projects = [
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
    const trpc = useTRPC();
    const accountDetails = useSuspenseQuery(trpc.user.getAccountDetails.queryOptions({}));
    const [projectsState, setProjectsState] = useState<typeof projects>(projects);

    if (accountDetails.isLoading) {
        return <Loader2 className="animate-spin" />;
    }

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
        console.log(accountDetails.data?.role);
        if (accountDetails.data?.role === 'ADMIN') {
            setProjectsState([...projects, {
                name: 'admin',
                url: '/dashboard/admin-panel',
                icon: Users,
            }]);
        }
    }, [accountDetails.data?.role]);

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup className="group-data-[collapsible=icon]:hidden">
                    <SidebarMenu>
                        {projectsState.map(item => (
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
                                <EditSettingsFormModal />
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
                <NavUser
                    user={{
                        email: accountDetails.data?.email,
                        name: accountDetails.data?.username,
                        avatar: '',
                    }}
                />
            </SidebarFooter>
        </Sidebar>
    );
}
