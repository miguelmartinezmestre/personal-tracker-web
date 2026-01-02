import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardLayout } from './dashboard-layout';

// Mock app-sidebar
vi.mock('@/components/app-sidebar', () => ({
    AppSidebar: () => <aside data-testid="app-sidebar">App Sidebar</aside>,
}));

// Mock theme-switcher
vi.mock('@/components/theme-switcher', () => ({
    ThemeToggle: () => <button data-testid="theme-toggle">Theme Toggle</button>,
}));

// Mock language-switcher
vi.mock('./language-switcher', () => ({
    LanguageSwitcher: () => <button data-testid="language-switcher">Language Switcher</button>,
}));

// Mock command
vi.mock('@/components/command', () => ({
    default: () => <div data-testid="command-menu">Command Menu</div>,
}));

// Mock @repo/ui sidebar components
vi.mock('@repo/ui/components/sidebar', () => ({
    SidebarProvider: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="sidebar-provider">{children}</div>
    ),
    SidebarInset: ({ children }: { children: React.ReactNode }) => (
        <main data-testid="sidebar-inset">{children}</main>
    ),
    SidebarTrigger: ({ className }: { className?: string }) => (
        <button data-testid="sidebar-trigger" className={className}>Toggle</button>
    ),
}));

describe('DashboardLayout', () => {
    it('renders children content', () => {
        render(
            <DashboardLayout>
                <div data-testid="child-content">Page Content</div>
            </DashboardLayout>
        );

        expect(screen.getByTestId('child-content')).toBeInTheDocument();
        expect(screen.getByText('Page Content')).toBeInTheDocument();
    });

    it('renders sidebar provider', () => {
        render(
            <DashboardLayout>
                <div>Content</div>
            </DashboardLayout>
        );

        expect(screen.getByTestId('sidebar-provider')).toBeInTheDocument();
    });

    it('renders app sidebar', () => {
        render(
            <DashboardLayout>
                <div>Content</div>
            </DashboardLayout>
        );

        expect(screen.getByTestId('app-sidebar')).toBeInTheDocument();
    });

    it('renders sidebar inset', () => {
        render(
            <DashboardLayout>
                <div>Content</div>
            </DashboardLayout>
        );

        expect(screen.getByTestId('sidebar-inset')).toBeInTheDocument();
    });

    it('renders sidebar trigger', () => {
        render(
            <DashboardLayout>
                <div>Content</div>
            </DashboardLayout>
        );

        expect(screen.getByTestId('sidebar-trigger')).toBeInTheDocument();
    });

    it('renders theme toggle in header', () => {
        render(
            <DashboardLayout>
                <div>Content</div>
            </DashboardLayout>
        );

        expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    });

    it('renders language switcher in header', () => {
        render(
            <DashboardLayout>
                <div>Content</div>
            </DashboardLayout>
        );

        expect(screen.getByTestId('language-switcher')).toBeInTheDocument();
    });

    it('renders command menu', () => {
        render(
            <DashboardLayout>
                <div>Content</div>
            </DashboardLayout>
        );

        expect(screen.getByTestId('command-menu')).toBeInTheDocument();
    });

    it('renders header element', () => {
        render(
            <DashboardLayout>
                <div>Content</div>
            </DashboardLayout>
        );

        const header = screen.getByRole('banner');
        expect(header).toBeInTheDocument();
    });

    it('renders nested children correctly', () => {
        render(
            <DashboardLayout>
                <div>
                    <h1>Dashboard Title</h1>
                    <section>
                        <p>Dashboard content</p>
                    </section>
                </div>
            </DashboardLayout>
        );

        expect(screen.getByText('Dashboard Title')).toBeInTheDocument();
        expect(screen.getByText('Dashboard content')).toBeInTheDocument();
    });

    it('wraps children in grid container', () => {
        const { container } = render(
            <DashboardLayout>
                <div data-testid="child">Content</div>
            </DashboardLayout>
        );

        const gridContainer = container.querySelector('.grid');
        expect(gridContainer).toBeInTheDocument();
    });
});
