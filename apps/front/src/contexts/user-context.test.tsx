import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserProvider, useUser } from './user-context';
import { Id } from '@repo/backend/convex/_generated/dataModel';

// Mock user data - must match the type from api.auth.getCurrentUser
const mockUser = {
    _id: 'user123' as Id<'user'>,
    _creationTime: Date.now(),
    userId: 'user123',
    email: 'test@example.com',
    name: 'Test User',
    emailVerified: false,
    image: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
};

describe('UserContext', () => {
    it('should provide user context', () => {
        const TestComponent = () => {
            const user = useUser();
            return <div>User: {user?.email || 'no email'}</div>;
        };

        render(
            <UserProvider user={mockUser}>
                <TestComponent />
            </UserProvider>
        );

        expect(screen.getByText('User: test@example.com')).toBeInTheDocument();
    });

    it('should throw error when useUser is used outside provider', () => {
        // Suppress console.error for this test
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const TestComponent = () => {
            useUser();
            return <div>Test</div>;
        };

        expect(() => {
            render(<TestComponent />);
        }).toThrow('useUser must be used within a UserProvider');

        consoleSpy.mockRestore();
    });

    it('should provide access to all user properties', () => {
        const TestComponent = () => {
            const user = useUser();
            if (!user) return <div>No user</div>;
            return (
                <div>
                    <div data-testid="email">{user.email || ''}</div>
                    <div data-testid="name">{user.name || ''}</div>
                    <div data-testid="userId">{user._id || ''}</div>
                </div>
            );
        };

        render(
            <UserProvider user={mockUser}>
                <TestComponent />
            </UserProvider>
        );

        expect(screen.getByTestId('email')).toHaveTextContent('test@example.com');
        expect(screen.getByTestId('name')).toHaveTextContent('Test User');
        expect(screen.getByTestId('userId')).toHaveTextContent('user123');
    });
});
