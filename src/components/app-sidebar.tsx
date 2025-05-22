'use client';

import { Bell, Frame, Home, Loader2, Settings } from 'lucide-react';
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
import { NavUser } from './nav-user';
import EditSettingsFormModal from '@/components/settings/account-settings-modal';
import Link from 'next/link';
import { useTRPC } from '@/trpc/client';
import { useSuspenseQuery } from '@tanstack/react-query';
// import { useAuthContext } from '@/providers/auth-provider';
// import { LanguageSwitcher } from './team-switcher';
// import { useTranslation } from 'react-i18next';

const projects = [
    {
        name: 'Home',
        url: '/dashboard/home',
        icon: Home,
    },
    {
        name: 'Objectives',
        url: '/dashboard/objectives',
        icon: Frame,
    },
    {
        name: 'Notifications',
        url: '/dashboard/notifications',
        icon: Bell,
    },
    {
        name: 'Sessions',
        url: '/dashboard/sessions',
        icon: Frame,
    },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {

    const trpc = useTRPC();
    const accountDetails = useSuspenseQuery(trpc.user.getAccountDetails.queryOptions({}));
    // const { user, isLoading } = useAuthContext();
    // const { t } = useTranslation();

    if (accountDetails.isLoading) {
        return <Loader2 className="animate-spin"/>;
    }

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                {/* <LanguageSwitcher
                    languages={[
                        {
                            // name: t('english'),
                            name: 'English',
                            code: 'en',
                        },
                        {
                            // name: t('spanish'),
                            name: 'Spanish',
                            code: 'es',
                        },
                    ]}
                /> */}
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup className="group-data-[collapsible=icon]:hidden">
                    <SidebarMenu>
                        {projects.map(item => (
                            <SidebarMenuItem key={item.name}>
                                <SidebarMenuButton asChild>
                                    <Link href={item.url} prefetch={true}>
                                        <item.icon />
                                        {/* <span>{t(String(item.name).toLowerCase())}</span> */}
                                        {item.name}
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
