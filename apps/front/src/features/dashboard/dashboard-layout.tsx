import { AppSidebar } from '@/features/dashboard/app-sidebar';
import { ThemeToggle } from '@/features/theme/theme-switcher';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@repo/ui/components/sidebar';
import CommandMenu from '@/features/dashboard/command';
import { LanguageSwitcher } from '@/features/landing/language-switcher';
import { OrganizationSwitcher } from '@/features/teams/organization-switcher';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center px-4 justify-between transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
                    <div className="flex items-center gap-2">
                        <SidebarTrigger className="-ml-1" />
                        {/* Hidden element for tour targeting - available on all dashboard pages */}
                        <span data-tour="welcome-message" className="sr-only" aria-hidden="true">
                            Dashboard welcome message
                        </span>
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
