'use client';

import { Bell, Frame, Goal, Home } from 'lucide-react';
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
import { useState } from 'react';
import { useTranslations } from 'next-intl';

type ProjectNavItem = {
    name: string;
    url: Route;
    icon: LucideIcon;
};

const projects: ProjectNavItem[] = [
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
    // const accountDetails = useSuspenseQuery(trpc.user.getAccountDetails.queryOptions({}));
    const [projectsState] = useState<typeof projects>(projects);

    // if (accountDetails.isLoading) {
    //     return <Loader2 className="animate-spin" />;
    // }

    // // eslint-disable-next-line react-hooks/rules-of-hooks
    // useEffect(() => {
    //     console.log(accountDetails.data?.role);
    //     if (accountDetails.data?.role === 'ADMIN') {
    //         setProjectsState([...projects, {
    //             name: 'admin',
    //             url: '/dashboard/admin-panel',
    //             icon: Users,
    //         }]);
    //     }
    // }, [accountDetails.data?.role]);

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup className="group-data-[collapsible=icon]:hidden">
                    <SidebarMenu>
                        {projectsState.map((item: typeof projects[number]) => (
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
