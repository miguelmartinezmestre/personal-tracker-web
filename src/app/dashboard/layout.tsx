import { preloadAuthQuery } from '@/features/auth/auth-server';
import { api } from '@/convex/_generated/api';
import { AppSidebar } from '@/features/dashboard/components/app-sidebar';
import { ThemeToggle } from '@/features/theme/theme-switcher';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import CommandMenu from '@/features/dashboard/components/command';
import { LanguageSwitcher } from '@/features/landing/components/language-switcher';
import { OrganizationSwitcher } from '@/features/organizations/components/organization-switcher';
import { NotificationBell } from '@/features/notifications/components/notification-bell';
import { SignOutButton } from '@/features/auth/components/sign-out-button';
import { redirect } from 'next/navigation';
import { Preloaded } from 'convex/react';

export default async function Layout({ children }: { children: React.ReactNode }) {
    let preloadedUserQuery: Preloaded<typeof api.auth.getCurrentUser>;

    try {
        preloadedUserQuery = await preloadAuthQuery(api.auth.getCurrentUser);
    } catch (error) {
        console.error(error);
        redirect('/login');
    }

    return (
        <SidebarProvider>
            <AppSidebar preloadedUserQuery={preloadedUserQuery} />
            <SidebarInset>
                <header className="grid h-16 min-w-0 shrink-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
                    <div className="flex min-w-0 items-center gap-2">
                        <SidebarTrigger className="-ml-1" />
                    </div>
                    <div className="flex min-w-0 items-center justify-end gap-1 sm:gap-2">
                        <OrganizationSwitcher />
                        <NotificationBell />
                        <ThemeToggle />
                        <LanguageSwitcher />
                        <SignOutButton />
                    </div>
                </header>
                <CommandMenu />
                <div className="grid w-full min-w-0 [grid-template-columns:minmax(0,1fr)] gap-4 p-4 pt-0 [&>*]:min-w-0">
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
