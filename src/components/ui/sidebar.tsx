"use client";
import * as React from "react";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { PanelLeftIcon } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, } from "@/components/ui/sheet";
const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_MOBILE = "18rem";
const SIDEBAR_WIDTH_ICON = "3rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";
type SidebarContextProps = {
    state: "expanded" | "collapsed";
    openMobile: boolean;
    setOpenMobile: React.Dispatch<React.SetStateAction<boolean>>;
    isMobile: boolean;
    toggleSidebar: () => void;
};
const SidebarContext = React.createContext<SidebarContextProps | null>(null);
function useSidebar() {
    const context = React.useContext(SidebarContext);
    if (!context) {
        throw new Error("useSidebar must be used within a SidebarProvider.");
    }
    return context;
}
function SidebarProvider({ className, style, children, ...props }: React.ComponentProps<"div">) {
    const isMobile = useIsMobile();
    const [openMobile, setOpenMobile] = React.useState(false);
    const [open, setOpen] = React.useState(true);
    const toggleSidebar = React.useCallback(() => {
        if (isMobile) {
            setOpenMobile((open) => !open);
        }
        else {
            setOpen((open) => !open);
        }
    }, [isMobile, setOpen, setOpenMobile]);
    React.useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
                (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                toggleSidebar();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [toggleSidebar]);
    const state = open ? "expanded" : "collapsed";
    const contextValue = React.useMemo<SidebarContextProps>(() => ({
        state,
        isMobile,
        openMobile,
        setOpenMobile,
        toggleSidebar,
    }), [state, isMobile, openMobile, toggleSidebar]);
    return (<SidebarContext.Provider value={contextValue}>
        <div data-slot="sidebar-wrapper" style={Object.assign({ ...style }, {
            "--sidebar-width": SIDEBAR_WIDTH,
            "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
        })} className={cn("group/sidebar-wrapper flex min-h-svh w-full", className)} {...props}>
          {children}
        </div>
    </SidebarContext.Provider>);
}
function Sidebar({ className, children, ...props }: React.ComponentProps<"div">) {
    const { isMobile, state, openMobile, setOpenMobile } = useSidebar();
    if (isMobile) {
        const mobileSidebarStyle: React.CSSProperties = {};
        Object.assign(mobileSidebarStyle, {
            "--sidebar-width": SIDEBAR_WIDTH_MOBILE,
        });
        return (<Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
        <SheetContent data-sidebar="sidebar" data-slot="sidebar" data-mobile="true" className="bg-sidebar text-sidebar-foreground w-(--sidebar-width) p-0 [&>button]:hidden" style={mobileSidebarStyle}>
          <SheetHeader className="sr-only">
            <SheetTitle>Sidebar</SheetTitle>
            <SheetDescription>Displays the mobile sidebar.</SheetDescription>
          </SheetHeader>
          <div className="flex h-full w-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>);
    }
    return (<div className="group peer text-sidebar-foreground hidden md:block" data-state={state} data-collapsible={state === "collapsed" ? "icon" : ""} data-slot="sidebar">
      <div data-slot="sidebar-gap" className="relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear group-data-[collapsible=icon]:w-(--sidebar-width-icon)"/>
      <div data-slot="sidebar-container" className={cn("fixed inset-y-0 left-0 z-10 hidden h-svh w-(--sidebar-width) border-r transition-[width] duration-200 ease-linear group-data-[collapsible=icon]:w-(--sidebar-width-icon) md:flex", className)} {...props}>
        <div data-sidebar="sidebar" data-slot="sidebar-inner" className="bg-sidebar flex h-full w-full flex-col">
          {children}
        </div>
      </div>
    </div>);
}
function SidebarTrigger({ className, onClick, ...props }: React.ComponentProps<typeof Button>) {
    const { toggleSidebar } = useSidebar();
    return (<Button data-sidebar="trigger" data-slot="sidebar-trigger" variant="ghost" size="icon" className={cn("size-7", className)} onClick={(event) => {
            onClick?.(event);
            toggleSidebar();
        }} {...props}>
      <PanelLeftIcon />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>);
}
function SidebarInset({ className, ...props }: React.ComponentProps<"div">) {
    return (<div data-slot="sidebar-inset" className={cn("bg-background relative flex w-full flex-1 flex-col", className)} {...props}/>);
}
function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
    return (<div data-slot="sidebar-header" data-sidebar="header" className={cn("flex flex-col gap-2 p-2", className)} {...props}/>);
}
function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
    return (<div data-slot="sidebar-content" data-sidebar="content" className={cn("flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden", className)} {...props}/>);
}
function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
    return (<div data-slot="sidebar-group" data-sidebar="group" className={cn("relative flex w-full min-w-0 flex-col p-2", className)} {...props}/>);
}
function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
    return (<ul data-slot="sidebar-menu" data-sidebar="menu" className={cn("flex w-full min-w-0 flex-col gap-1", className)} {...props}/>);
}
function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
    return (<li data-slot="sidebar-menu-item" data-sidebar="menu-item" className={cn("group/menu-item relative", className)} {...props}/>);
}
type SidebarMenuButtonOwnProps = React.ComponentProps<'button'> & {
    'data-slot'?: string;
    'data-sidebar'?: string;
};

function SidebarMenuButton({ className, render, ...props }: useRender.ComponentProps<'button'>) {
    const ownProps: SidebarMenuButtonOwnProps = {
        'data-slot': 'sidebar-menu-button',
        'data-sidebar': 'menu-button',
        className: cn('peer/menu-button flex h-8 w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0', className),
    };
    return useRender({
        defaultTagName: 'button',
        render,
        props: mergeProps<'button'>(ownProps, props),
    });
}
export { Sidebar, SidebarContent, SidebarGroup, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar, };
