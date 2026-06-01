import { fetchAuthQuery } from '@/features/auth/server';
import { api } from '@/convex/_generated/api';
import { AppSidebar } from '@/features/dashboard';
import { ThemeToggle } from '@/platform/theme/theme-switcher';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { CommandMenu } from '@/features/dashboard';
import { LanguageSwitcher } from '@/features/landing';
import { OrganizationSwitcher } from '@/features/organizations';
import { NotificationBell } from '@/features/notifications';
import { SignOutButton } from '@/features/auth';
import { redirect } from 'next/navigation';
import { checkPlatformSetUp } from '@/features/setup/server';
import { NotificationSonnerListener } from '@/features/notifications';

export const dynamic = 'force-dynamic';

export default async function Layout({ children }: { children: React.ReactNode }) {
    const isPlatformSetUp = await checkPlatformSetUp();
    if (!isPlatformSetUp) {
        redirect('/setup');
    }

    const initialUser = await fetchAuthQuery(api.auth.getCurrentUser).catch(() => null);
    if (!initialUser) {
        redirect('/login');
    }

    return (
        <SidebarProvider>
            <AppSidebar initialUser={initialUser} />
            <SidebarInset>
                <header className="grid h-16 min-w-0 shrink-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
                    <div className="flex min-w-0 items-center gap-2">
                        <SidebarTrigger className="-ml-1" />
                    </div>
                    <div className="flex min-w-0 items-center justify-end gap-1 sm:gap-2">
                        <OrganizationSwitcher />
                        <NotificationBell />
                        <ThemeToggle testId="dashboard-theme-toggle" />
                        <LanguageSwitcher />
                        <SignOutButton />
                    </div>
                </header>
                <CommandMenu />
                <NotificationSonnerListener />
                <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)] gap-4 p-4 pt-0 [&>*]:min-w-0">
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
