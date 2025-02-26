'use client';

import * as React from 'react';
import {
    AudioWaveform,
    Bell,
    BookOpen,
    Bot,
    Command,
    Frame,
    GalleryVerticalEnd,
    Home,
    Settings2,
    SquareTerminal,
} from 'lucide-react';
import { Sidebar, SidebarContent, SidebarFooter } from './ui/sidebar';
import { NavProjects } from './nav-projects';
import { NavUser } from './nav-user';
import useAuth from '../hooks/useAuth';

// This is sample data.
const data = {
    user: {
        name: 'shadcn',
        email: 'm@example.com',
        avatar: '/avatars/shadcn.jpg',
    },
    teams: [
        {
            name: 'Acme Inc',
            logo: GalleryVerticalEnd,
            plan: 'Enterprise',
        },
        {
            name: 'Acme Corp.',
            logo: AudioWaveform,
            plan: 'Startup',
        },
        {
            name: 'Evil Corp.',
            logo: Command,
            plan: 'Free',
        },
    ],
    navMain: [
        {
            title: 'Playground',
            url: '#',
            icon: SquareTerminal,
            isActive: true,
            items: [
                {
                    title: 'History',
                    url: '#',
                },
                {
                    title: 'Starred',
                    url: '#',
                },
                {
                    title: 'Settings',
                    url: '#',
                },
            ],
        },
        {
            title: 'Models',
            url: '#',
            icon: Bot,
            items: [
                {
                    title: 'Genesis',
                    url: '#',
                },
                {
                    title: 'Explorer',
                    url: '#',
                },
                {
                    title: 'Quantum',
                    url: '#',
                },
            ],
        },
        {
            title: 'Documentation',
            url: '#',
            icon: BookOpen,
            items: [
                {
                    title: 'Introduction',
                    url: '#',
                },
                {
                    title: 'Get Started',
                    url: '#',
                },
                {
                    title: 'Tutorials',
                    url: '#',
                },
                {
                    title: 'Changelog',
                    url: '#',
                },
            ],
        },
        {
            title: 'Settings',
            url: '#',
            icon: Settings2,
            items: [
                {
                    title: 'General',
                    url: '#',
                },
                {
                    title: 'Team',
                    url: '#',
                },
                {
                    title: 'Billing',
                    url: '#',
                },
                {
                    title: 'Limits',
                    url: '#',
                },
            ],
        },
    ],
    projects: [
        {
            name: 'Home',
            url: '/dashboard/home',
            icon: Home,
        },
        {
            name: 'Objetives',
            url: '/dashboard/objetives',
            icon: Frame,
        },
        {
            name: 'Notifications',
            url: '/dashboard/notifications',
            icon: Bell,
        },
        {
            name: 'Sesiones',
            url: '/dashboard/sessions',
            icon: Frame,
        },
    ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const auth = useAuth();

    return (
        <Sidebar collapsible="icon" {...props}>
            {/* <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader> */}
            <SidebarContent>
                {/* <NavMain items={data.navMain} /> */}
                <NavProjects projects={data.projects} />
            </SidebarContent>
            <SidebarFooter>
                <NavUser
                    user={{
                        name: auth ? auth.name : '',
                        email: auth ? auth.email : '',
                        avatar: '',
                    }}
                />
            </SidebarFooter>
            {/* <SidebarRail /> */}
        </Sidebar>
    );
}
