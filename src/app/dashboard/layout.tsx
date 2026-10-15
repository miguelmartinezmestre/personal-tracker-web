import { fetchAuthQuery, isAuthRequiredError } from '@/features/auth/server';
import { api } from '@/convex/_generated/api';
import { AppSidebar } from '@/features/dashboard';
import { ThemeToggle } from '@/platform/theme/theme-switcher';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { CommandMenu } from '@/features/dashboard';
import { LanguageSwitcher } from '@/features/landing';
import { OrganizationSwitcher } from '@/features/organizations';
import { SignOutButton } from '@/features/auth';
import { redirect } from 'next/navigation';
import { isPlatformSetUp } from '@/features/setup/server';
import { getTranslations } from 'next-intl/server';
import { SkipToContent } from '@/components/skip-to-content';
export const dynamic = 'force-dynamic';
export default async function Layout({ children }: { children: React.ReactNode }) {
    const t = await getTranslations('Common');
    if (!(await isPlatformSetUp())) {
        redirect('/setup');
    }
    let dashboardContext: Awaited<ReturnType<typeof fetchDashboardContext>>;
    try {
        dashboardContext = await fetchDashboardContext();
    } catch (error) {
        if (isAuthRequiredError(error)) {
            redirect('/login');
        }
        throw error;
    }
    const { organizationId: activeOrganizationId } = dashboardContext;
    const dashboardScopeKey = activeOrganizationId ?? 'no-active-organization';
    return (
        <SidebarProvider>
            <SkipToContent targetId="dashboard-main" label={t('skipToContent')} />
            <AppSidebar />
            <SidebarInset>
                <header className="grid h-16 min-w-0 shrink-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
                    <div className="flex min-w-0 items-center gap-2">
                        <SidebarTrigger className="-ml-1" label={t('toggleSidebar')} />
                    </div>
                    <div className="flex min-w-0 items-center justify-end gap-1 sm:gap-2">
                        <OrganizationSwitcher
                            key={activeOrganizationId ?? 'no-active-organization'}
                            initialActiveOrganizationId={activeOrganizationId}
                        />
                        <ThemeToggle testId="dashboard-theme-toggle" />
                        <LanguageSwitcher />
                        <SignOutButton />
                    </div>
                </header>
                <CommandMenu />
                <main
                    id="dashboard-main"
                    tabIndex={-1}
                    key={dashboardScopeKey}
                    className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)] gap-4 p-4 pt-0 [&>*]:min-w-0"
                >
                    {children}
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}
async function fetchDashboardContext() {
    return await fetchAuthQuery(api.auth.getDashboardContext);
}
