import { Bell, Frame, Home } from 'lucide-react';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from './ui/sidebar';
import { NavProjects } from './nav-projects';
import { NavUser } from './nav-user';
import { useAuthContext } from '../providers/auth-provider';
import { LanguageSwitcher } from './team-switcher';
import { useTranslation } from 'react-i18next';

const data = {
    projects: [
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
    ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const { user, isLoading } = useAuthContext();
    const { t } = useTranslation();

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <LanguageSwitcher
                    languages={[
                        {
                            name: t('english'),
                            code: 'en',
                        },
                        {
                            name: t('spanish'),
                            code: 'es',
                        },
                    ]}
                />
            </SidebarHeader>
            <SidebarContent>
                <NavProjects projects={data.projects} />
            </SidebarContent>
            <SidebarFooter>
                <NavUser
                    user={{
                        name: user ? user.name : '',
                        email: user ? user.email : '',
                        avatar: '',
                    }}
                />
            </SidebarFooter>
        </Sidebar>
    );
}
