import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SidebarProvider } from '../../../components/ui/sidebar';
import { AppSidebar } from './app-sidebar';

let currentPathname = '/dashboard/home';
let currentUser: { role?: 'admin' | 'user' } | null = { role: 'user' };

vi.mock('next/navigation', () => ({
  usePathname: () => currentPathname,
}));

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => {
    const labels: Record<string, string> = {
      'Sidebar.appName': 'Metrics App',
      'Sidebar.home': 'Home',
      'Sidebar.objectives': 'Objectives',
      'Sidebar.categories': 'Categories',
      'Sidebar.achievements': 'Achievements',
      'Sidebar.notifications': 'Notifications',
      'Sidebar.sessions': 'Sessions',
      'Sidebar.settings': 'Settings',
      'Sidebar.organizations': 'Organizations',
      'Sidebar.users': 'Users',
      'Sidebar.adminSessions': 'Admin Sessions',
      'Sidebar.adminAudit': 'Audit Logs',
    };

    return labels[`${namespace}.${key}`] ?? `${namespace}.${key}`;
  },
}));

vi.mock('@convex-dev/better-auth/nextjs/client', () => ({
  usePreloadedAuthQuery: () => currentUser,
}));

vi.mock('next/link', () => ({
  default: ({ href, prefetch: _prefetch, children, ...props }: any) => (
    <a href={typeof href === 'string' ? href : String(href)} {...props}>
      {children}
    </a>
  ),
}));

function renderSidebar() {
  render(
    <SidebarProvider>
      <AppSidebar preloadedUserQuery={{} as never} />
    </SidebarProvider>
  );
}

describe('AppSidebar', () => {
  beforeEach(() => {
    currentPathname = '/dashboard/home';
    currentUser = { role: 'user' };
  });

  it('renders base navigation entries for regular users', () => {
    renderSidebar();

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/dashboard/home');
    expect(screen.getByRole('link', { name: 'Objectives' })).toHaveAttribute(
      'href',
      '/dashboard/objectives'
    );
    expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument();
  });

  it('renders admin navigation entries for admins', () => {
    currentUser = { role: 'admin' };
    renderSidebar();

    expect(screen.getByRole('link', { name: 'Users' })).toHaveAttribute(
      'href',
      '/dashboard/admin/users'
    );
    expect(screen.getByRole('link', { name: 'Admin Sessions' })).toHaveAttribute(
      'href',
      '/dashboard/admin/sessions'
    );
    expect(screen.getByRole('link', { name: 'Audit Logs' })).toHaveAttribute(
      'href',
      '/dashboard/admin/audit'
    );
  });

  it('marks current route as active', () => {
    currentPathname = '/dashboard/objectives';
    renderSidebar();

    expect(screen.getByRole('link', { name: 'Objectives' })).toHaveClass('bg-accent');
  });
});
