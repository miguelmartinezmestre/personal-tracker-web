import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@/providers/theme';

// Mock next-themes
vi.mock('next-themes', () => ({
    ThemeProvider: ({ children, ...props }: { children: React.ReactNode; [key: string]: any }) => (
        <div data-testid="theme-provider" data-props={JSON.stringify(props)}>
            {children}
        </div>
    ),
}));

describe('ThemeProvider', () => {
    it('renders children', () => {
        render(
            <ThemeProvider>
                <div data-testid="child">Child content</div>
            </ThemeProvider>
        );

        expect(screen.getByTestId('child')).toBeInTheDocument();
        expect(screen.getByText('Child content')).toBeInTheDocument();
    });

    it('passes props to NextThemesProvider', () => {
        render(
            <ThemeProvider attribute="class" defaultTheme="dark">
                <div>Content</div>
            </ThemeProvider>
        );

        const provider = screen.getByTestId('theme-provider');
        const props = JSON.parse(provider.getAttribute('data-props') || '{}');
        expect(props.attribute).toBe('class');
        expect(props.defaultTheme).toBe('dark');
    });

    it('renders without props', () => {
        render(
            <ThemeProvider>
                <span>Test</span>
            </ThemeProvider>
        );

        expect(screen.getByText('Test')).toBeInTheDocument();
    });

    it('passes enableSystem prop', () => {
        render(
            <ThemeProvider enableSystem>
                <div>Content</div>
            </ThemeProvider>
        );

        const provider = screen.getByTestId('theme-provider');
        const props = JSON.parse(provider.getAttribute('data-props') || '{}');
        expect(props.enableSystem).toBe(true);
    });

    it('renders nested components correctly', () => {
        render(
            <ThemeProvider>
                <div>
                    <header>Header</header>
                    <main>Main content</main>
                    <footer>Footer</footer>
                </div>
            </ThemeProvider>
        );

        expect(screen.getByText('Header')).toBeInTheDocument();
        expect(screen.getByText('Main content')).toBeInTheDocument();
        expect(screen.getByText('Footer')).toBeInTheDocument();
    });
});
