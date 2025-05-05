import '@testing-library/jest-dom'; // Import jest-dom matchers

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// --- Assumption: Import the component responsible for rendering sessions ---
// Adjust the path and component name as needed
import Sessions from '../src/components/sessions'; // Example path/name

import * as AuthProvider from '../src/providers/auth-provider';
// --- Assumption: Import the query hook used to fetch sessions ---
// Adjust the path and hook name as needed
import * as SessionsQuery from '../src/services/queries/sessions'; // Example path/name
// --- Assumption: Import the Session model/type ---
// Adjust the path and type name as needed
import { Session } from '../src/models/session'; // Example path/name

// Mock Child Components if SessionsComponent renders complex children
// vi.mock('../src/components/session-details', () => ({ SessionDetails: () => <div data-testid="session-details-mock">Details Mock</div> }));
// vi.mock('../src/components/session-table', () => ({ SessionTable: ({ data }: { data: Session[] }) => <div data-testid="session-table-mock">Table Mock - Rows: {data?.length ?? 0}</div> }));

// Mock Auth Context
const mockUseAuthContext = vi.spyOn(AuthProvider, 'useAuthContext');

// Mock Sessions Query
// --- Assumption: Name of the query hook is useSessionsQuery ---
const mockUseSessionsQuery = vi.spyOn(SessionsQuery, 'useSessionsQuery');

// Helper function to render the Sessions component directly
const renderSessionsComponentDirectly = (
    authContextValueOverrides: Partial<ReturnType<typeof AuthProvider.useAuthContext>>,
    sessionsQueryValue: Partial<ReturnType<typeof SessionsQuery.useSessionsQuery>> // Adjust hook name if needed
) => {
    const authContextValue = {
        user: { id: 1, name: 'Test User', email: 'test@example.com' },
        isLoading: false,
        ...authContextValueOverrides,
    };
    mockUseAuthContext.mockReturnValue(authContextValue);

    // --- Adjust hook name if needed ---
    mockUseSessionsQuery.mockReturnValue({
        data: [],
        isLoading: false,
        refetch: vi.fn(),
        ...sessionsQueryValue,
    });

    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });

    // Render the component directly, wrapped in necessary providers
    return render(
        <QueryClientProvider client={queryClient}>
            <AuthProvider.AuthProvider value={authContextValue}>
                {/* --- Adjust component name if needed --- */}
                <Sessions />
            </AuthProvider.AuthProvider>
        </QueryClientProvider>
    );
};


describe('Sessions Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default mocks for happy path
        mockUseAuthContext.mockReturnValue({ user: { id: 1, name: 'Test User', email: 'test@example.com' }, isLoading: false });
        // --- Adjust hook name if needed ---
        mockUseSessionsQuery.mockReturnValue({ data: [], isLoading: false, refetch: vi.fn() });
    });

    it('should display loading state when auth context is loading', () => {
        renderSessionsComponentDirectly({ isLoading: true }, {});
        // Check for a generic loading indicator; adjust text if needed
        expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
    });

    it('should display loading state when sessions query is loading', () => {
        // --- Adjust hook name if needed ---
        renderSessionsComponentDirectly({}, { isLoading: true });
        expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
    });

    it('should render empty state message or component when sessions query returns empty data', () => {
        // --- Adjust hook name if needed ---
        renderSessionsComponentDirectly({}, { data: [], isLoading: false });
        // Check for an empty state message or a specific component/element
        // Example: If it renders a specific message
        // expect(screen.getByText(/No active sessions found./i)).toBeInTheDocument();
        // Example: If it renders an empty table (assuming a table mock like dashboard-home)
        // expect(screen.getByTestId('session-table-mock')).toBeInTheDocument();
        // expect(screen.getByText(/Table Mock - Rows: 0/i)).toBeInTheDocument();
        // --- Add appropriate assertion based on SessionsComponent's behavior ---
        expect(screen.queryByTestId('session-list-item')).not.toBeInTheDocument(); // Example: Assuming sessions are list items
    });

    it('should render session data when loaded successfully', async () => {
        const mockData: Session[] = [
            { id: 1, userId: 1, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36', status: 'active', value: '192.168.1.1' },
            // { id: 2, userId: 1, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36', status: 'active', value: '10.0.0.1' },
        ];
        renderSessionsComponentDirectly({}, { data: mockData, isLoading: false });

        // screen.debug();

        // Wait for the UI to update if necessary
        await waitFor(() => {
            // --- Check for elements that indicate session data is displayed ---
            // Example: Check for list items, table rows, or specific text
            const sessionItems = screen.getAllByTestId('table-row'); // Example test ID
            expect(sessionItems).toHaveLength(mockData.length);
            expect(screen.getByText(/PC Windows/i)).toBeInTheDocument();
            expect(screen.getByText(/Windows 10/i)).toBeInTheDocument();
            expect(screen.getByText(/Chrome 135.0.0.0/i)).toBeInTheDocument();
            // Example: Check if a mocked table component received the data
            // expect(screen.getByTestId('session-table-mock')).toBeInTheDocument();
            // expect(screen.getByText(/Table Mock - Rows: 2/i)).toBeInTheDocument();
        });
    });

    // Add more tests as needed:
    // - Test error states (e.g., sessionsQuery fails)
    // - Test user interactions (e.g., clicking a button to revoke a session)
    // - Test pagination or filtering if applicable
});

// --- Helper type definition (adjust based on actual Session model) ---
// declare module '../src/models/session' { // Use declare module if Session type is complex/imported
//     interface Session {
//         id: string;
//         userId: number;
//         ipAddress: string;
//         userAgent: string;
//         lastActive: Date;
//         createdAt: Date;
//     }
// }

// --- Helper type definition (adjust based on actual query hook return type) ---
// declare module '../src/services/queries/sessions' { // Use declare module if hook type is complex/imported
//     interface UseSessionsQueryResult { // Example type name
//         data: Session[] | undefined;
//         isLoading: boolean;
//         error: Error | null;
//         refetch: () => void;
//     }
//     function useSessionsQuery(): UseSessionsQueryResult // Example hook signature
// }
