import { preloadAuthQuery } from '@/features/auth/auth-server';
import { api } from '@repo/backend/convex/_generated/api';
import { AppSidebar } from '@/features/dashboard/components/app-sidebar';
import { ThemeToggle } from '@/features/theme/theme-switcher';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@repo/ui/components/sidebar';
import CommandMenu from '@/features/dashboard/components/command';
import { LanguageSwitcher } from '@/features/landing/components/language-switcher';
import { OrganizationSwitcher } from '@/features/organizations/components/organization-switcher';

export default async function Layout({ children }: { children: React.ReactNode }) {

    const preloadedUserQuery = await preloadAuthQuery(api.auth.getCurrentUser);

    return (
        <SidebarProvider>
            <AppSidebar preloadedUserQuery={preloadedUserQuery} />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center px-4 justify-between transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
                    <div className="flex items-center gap-2">
                        <SidebarTrigger className="-ml-1" />
                    </div>
                    <div className="flex items-center gap-2">
                        <OrganizationSwitcher />
                        <ThemeToggle />
                        <LanguageSwitcher />
                    </div>
                </header>
                <CommandMenu />
                <div className="grid grid-cols-1 gap-4 p-4 pt-0">{children}</div>
            </SidebarInset>
        </SidebarProvider>
    );
}
