import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BreadcrumbNav } from '@/components/breadcrump';

// Mock next/navigation
vi.mock('next/navigation', () => ({
    usePathname: vi.fn(),
    useSelectedLayoutSegments: vi.fn(),
}));

// Mock next/link
vi.mock('next/link', () => ({
    default: ({
        children,
        href,
        ...props
    }: {
        children: React.ReactNode;
        href: string | object;
    }) => (
        <a
            href={
                typeof href === 'object' ? (href as unknown as { pathname: string }).pathname : href
            }
            {...props}
        >
            {children}
        </a>
    ),
}));

// Mock @repo/ui
vi.mock('@repo/ui/lib/utils', () => ({
    cn: (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' '),
}));

import { usePathname, useSelectedLayoutSegments } from 'next/navigation';

describe('BreadcrumbNav', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns null on home page', () => {
        vi.mocked(usePathname).mockReturnValue('/dashboard/home');
        vi.mocked(useSelectedLayoutSegments).mockReturnValue([]);

        const { container } = render(<BreadcrumbNav />);
        expect(container.firstChild).toBeNull();
    });

    it('renders breadcrumb on non-home pages', () => {
        vi.mocked(usePathname).mockReturnValue('/dashboard/objectives');
        vi.mocked(useSelectedLayoutSegments).mockReturnValue(['objectives']);

        render(<BreadcrumbNav />);

        expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('renders home link', () => {
        vi.mocked(usePathname).mockReturnValue('/dashboard/objectives');
        vi.mocked(useSelectedLayoutSegments).mockReturnValue(['objectives']);

        render(<BreadcrumbNav />);

        const homeLink = screen.getByRole('link', { name: /home/i });
        expect(homeLink).toHaveAttribute('href', '/dashboard/home');
    });

    it('renders segment as last item without link', () => {
        vi.mocked(usePathname).mockReturnValue('/dashboard/objectives');
        vi.mocked(useSelectedLayoutSegments).mockReturnValue(['objectives']);

        render(<BreadcrumbNav />);

        const lastItem = screen.getByText('Objectives');
        expect(lastItem.tagName).toBe('SPAN');
        expect(lastItem).toHaveAttribute('aria-current', 'page');
    });

    it('renders multiple segments correctly', () => {
        vi.mocked(usePathname).mockReturnValue('/dashboard/objectives/create');
        vi.mocked(useSelectedLayoutSegments).mockReturnValue(['objectives', 'create']);

        render(<BreadcrumbNav />);

        // First segment should be a link
        const objectivesLink = screen.getByRole('link', { name: 'Objectives' });
        expect(objectivesLink).toHaveAttribute('href', '/objectives');

        // Last segment should be text only
        const createText = screen.getByText('Create');
        expect(createText).toHaveAttribute('aria-current', 'page');
    });

    it('formats segment names correctly', () => {
        vi.mocked(usePathname).mockReturnValue('/dashboard/my-objectives');
        vi.mocked(useSelectedLayoutSegments).mockReturnValue(['my-objectives']);

        render(<BreadcrumbNav />);

        // Should convert hyphens to spaces and capitalize
        expect(screen.getByText('My Objectives')).toBeInTheDocument();
    });

    it('skips route groups in parentheses', () => {
        vi.mocked(usePathname).mockReturnValue('/dashboard/settings');
        vi.mocked(useSelectedLayoutSegments).mockReturnValue(['(auth)', 'settings']);

        render(<BreadcrumbNav />);

        // Should not render (auth) segment
        expect(screen.queryByText('(auth)')).not.toBeInTheDocument();
        expect(screen.queryByText('Auth')).not.toBeInTheDocument();
        expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('accepts custom homeLabel', () => {
        vi.mocked(usePathname).mockReturnValue('/dashboard/objectives');
        vi.mocked(useSelectedLayoutSegments).mockReturnValue(['objectives']);

        render(<BreadcrumbNav homeLabel="Dashboard" />);

        const homeLink = screen.getByRole('link', { name: 'Dashboard' });
        expect(homeLink).toBeInTheDocument();
    });

    it('applies custom className', () => {
        vi.mocked(usePathname).mockReturnValue('/dashboard/objectives');
        vi.mocked(useSelectedLayoutSegments).mockReturnValue(['objectives']);

        render(<BreadcrumbNav className="custom-class" />);

        const nav = screen.getByRole('navigation');
        expect(nav.className).toContain('custom-class');
    });

    it('has accessible aria-label', () => {
        vi.mocked(usePathname).mockReturnValue('/dashboard/objectives');
        vi.mocked(useSelectedLayoutSegments).mockReturnValue(['objectives']);

        render(<BreadcrumbNav />);

        const nav = screen.getByRole('navigation');
        expect(nav).toHaveAttribute('aria-label');
    });
});
