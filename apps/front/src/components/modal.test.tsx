import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Modal } from './modal';

// Mock @repo/ui components
vi.mock('@repo/ui/components/button', () => ({
    Button: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
        <button data-testid="button" data-variant={variant}>
            {children}
        </button>
    ),
}));

vi.mock('@repo/ui/components/dialog', () => ({
    Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => (
        <div data-testid="dialog" data-open={open}>
            {children}
        </div>
    ),
    DialogContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
        <div data-testid="dialog-content" className={className}>
            {children}
        </div>
    ),
    DialogDescription: ({ children }: { children: React.ReactNode }) => (
        <p data-testid="dialog-description">{children}</p>
    ),
    DialogHeader: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="dialog-header">{children}</div>
    ),
    DialogTitle: ({ children }: { children: React.ReactNode }) => (
        <h2 data-testid="dialog-title">{children}</h2>
    ),
    DialogTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => (
        <div data-testid="dialog-trigger" data-as-child={asChild}>
            {children}
        </div>
    ),
}));

describe('Modal', () => {
    const defaultProps = {
        title: 'Test Title',
        description: 'Test Description',
        children: <div data-testid="modal-children">Modal Content</div>,
        isOpen: true,
        onOpenChange: vi.fn(),
    };

    it('renders with title and description', () => {
        render(<Modal {...defaultProps} />);

        expect(screen.getByTestId('dialog-title')).toHaveTextContent('Test Title');
        expect(screen.getByTestId('dialog-description')).toHaveTextContent('Test Description');
    });

    it('renders children content', () => {
        render(<Modal {...defaultProps} />);

        expect(screen.getByTestId('modal-children')).toBeInTheDocument();
        expect(screen.getByText('Modal Content')).toBeInTheDocument();
    });

    it('passes open state to Dialog', () => {
        render(<Modal {...defaultProps} isOpen={true} />);

        const dialog = screen.getByTestId('dialog');
        expect(dialog).toHaveAttribute('data-open', 'true');
    });

    it('passes closed state to Dialog', () => {
        render(<Modal {...defaultProps} isOpen={false} />);

        const dialog = screen.getByTestId('dialog');
        expect(dialog).toHaveAttribute('data-open', 'false');
    });

    it('renders trigger button with buttonText', () => {
        render(<Modal {...defaultProps} buttonText="Open Modal" />);

        expect(screen.getByText('Open Modal')).toBeInTheDocument();
    });

    it('hides trigger button when buttonHidden is true', () => {
        render(<Modal {...defaultProps} buttonHidden={true} buttonText="Hidden Button" />);

        expect(screen.queryByText('Hidden Button')).not.toBeInTheDocument();
    });

    it('shows trigger button when buttonHidden is false', () => {
        render(<Modal {...defaultProps} buttonHidden={false} buttonText="Visible Button" />);

        expect(screen.getByText('Visible Button')).toBeInTheDocument();
    });

    it('shows trigger button by default when buttonHidden is not provided', () => {
        render(<Modal {...defaultProps} buttonText="Default Button" />);

        expect(screen.getByText('Default Button')).toBeInTheDocument();
    });

    it('renders button with outline variant', () => {
        render(<Modal {...defaultProps} buttonText="Styled Button" />);

        const button = screen.getByTestId('button');
        expect(button).toHaveAttribute('data-variant', 'outline');
    });

    it('applies correct className to DialogContent', () => {
        render(<Modal {...defaultProps} />);

        const content = screen.getByTestId('dialog-content');
        expect(content.className).toContain('sm:max-w-[900px]');
    });

    it('renders nested complex children', () => {
        const complexChildren = (
            <div>
                <form data-testid="form">
                    <input data-testid="input" />
                    <button data-testid="submit">Submit</button>
                </form>
            </div>
        );

        render(<Modal {...defaultProps}>{complexChildren}</Modal>);

        expect(screen.getByTestId('form')).toBeInTheDocument();
        expect(screen.getByTestId('input')).toBeInTheDocument();
        expect(screen.getByTestId('submit')).toBeInTheDocument();
    });
});
