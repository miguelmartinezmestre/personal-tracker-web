import { AppSidebar } from '@/components/app-sidebar';
import { ThemeToggle } from '@/components/theme-switcher';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@repo/ui/components/sidebar';
import CommandMenu from '@/components/command';
import { LanguageSwitcher } from './language-switcher';

export function DashboardLayout({ children }: { children: React.ReactNode }) {

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center px-4 justify-between transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
                    <div className="flex items-center gap-2">
                        <SidebarTrigger className="-ml-1" />
                    </div>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <LanguageSwitcher />
                    </div>
                </header>
                <CommandMenu />
                <div className="grid grid-cols-1 gap-4 p-4 pt-0">
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
