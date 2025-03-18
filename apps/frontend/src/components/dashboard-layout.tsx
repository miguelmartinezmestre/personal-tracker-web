import { ArrowLeft } from 'lucide-react';
import { AppSidebar } from './app-sidebar';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { SidebarProvider, SidebarInset, SidebarTrigger } from './ui/sidebar';
import { useRouter } from '@tanstack/react-router';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
                    <div className="flex items-center gap-2 px-4">
                        <SidebarTrigger className="-ml-1" />
                        <Separator orientation="vertical" className="mr-2 h-4" />
                        <Button variant="outline" size="icon" onClick={() => router.history.back()}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </div>
                </header>
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
            </SidebarInset>
        </SidebarProvider>
    );
}
