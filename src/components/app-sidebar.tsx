'use client';

import { Bell, Frame, Home, Settings } from 'lucide-react';
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
    // const { user, isLoading } = useAuthContext();
    // const { t } = useTranslation();

    // if (isLoading) {
    //     return <div>Loading...</div>;
    // }

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
                                    <Link href={item.url}>
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
                        // name: user ? user.name : '',
                        name: 'John Doe',
                        // email: user ? user.email : '',
                        email: 'john.doe@example.com',
                        avatar: '',
                    }}
                />
            </SidebarFooter>
        </Sidebar>
    );
}
