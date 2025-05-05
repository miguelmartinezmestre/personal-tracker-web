// /// <reference types="@testing-library/jest-dom" />

// import { describe, it } from 'vitest';
// import { Button } from '../src/components/ui/button';
// import { render } from '@testing-library/react';
// import React from 'react';

// describe('Dashboard Home Page Component', () => {
//     it('should render the component', () => {
//         render(<Button>Dashboard Home</Button>);
//     });
// });

// // import React from 'react';
// // import { render, screen, waitFor } from '@testing-library/react';
// // import { describe, it, expect, vi, beforeEach } from 'vitest';
// // import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// // // Remove route definition import
// // // import { Route as DashboardHomeRouteDefinition } from '../src/routes/dashboard/home/index';
// // // Import the new, isolated component
// // import { DashboardHomeContent } from '../src/components/dashboard-home-content';
// // import * as AuthProvider from '../src/providers/auth-provider';
// // import * as ObjectivesQuery from '../src/services/queries/objectives';
// // import { Objetive } from '../src/models/objetive';
// // // Remove NotFound import if it's only used for router
// // // import NotFound from '../src/components/not-found';

// // // --- Remove routeTree Mock ---
// // // vi.mock('../src/routeTree.gen', ...);
// // // Remove manual mocked tree definition
// // // const MockRouteComponent = ...
// // // const mockRootRoute = ...
// // // const mockDashboardRoute = ...
// // // const mockHomeRoute = ...
// // // const mockedRouteTreeForTest = ...
// // // --- End Remove routeTree Mock ---

// // // Get the component directly
// // const ComponentToTest = DashboardHomeContent;

// // // Mock Child Components
// // vi.mock('../src/components/graph1', () => ({ Graph1: () => <div data-testid="graph1-mock">Graph1 Mock</div> }));
// // vi.mock('../src/components/graph2', () => ({ Graph2: () => <div data-testid="graph2-mock">Graph2 Mock</div> }));
// // vi.mock('../src/components/graph3', () => ({ Graph3: () => <div data-testid="graph3-mock">Graph3 Mock</div> }));
// // vi.mock('../src/components/table', () => ({ DataTable: ({ data }: { data: Objetive[] }) => <div data-testid="data-table-mock">Table Mock - Rows: {data?.length ?? 0}</div> }));

// // // Mock Auth Context
// // const mockUseAuthContext = vi.spyOn(AuthProvider, 'useAuthContext');

// // // Mock Objectives Query
// // const mockUseObjectivesQuery = vi.spyOn(ObjectivesQuery, 'useObjectivesQuery');

// // // Simplified Helper function - No Router
// // const renderDashboardHomeDirectly = (
// //     authContextValueOverrides: Partial<ReturnType<typeof AuthProvider.useAuthContext>>,
// //     objectivesQueryValue: Partial<ReturnType<typeof ObjectivesQuery.useObjectivesQuery>>
// // ) => {
// //     const authContextValue = {
// //         user: { id: 1, name: 'Test User', email: 'test@example.com' },
// //         isLoading: false,
// //         ...authContextValueOverrides,
// //     };
// //     mockUseAuthContext.mockReturnValue(authContextValue);

// //     mockUseObjectivesQuery.mockReturnValue({
// //         data: [],
// //         isLoading: false,
// //         refetch: vi.fn(),
// //         ...objectivesQueryValue,
// //     });

// //     const queryClient = new QueryClient({
// //         defaultOptions: { queries: { retry: false } },
// //     });

// //     // Remove router creation logic
// //     // const memoryHistory = ...
// //     // const router = ...
// //     // await router.load();

// //     // Render the component directly
// //     return render(
// //         <QueryClientProvider client={queryClient}>
// //             <AuthProvider.AuthProvider value={authContextValue}>
// //                 {/* Render the imported component */}
// //                 <ComponentToTest />
// //             </AuthProvider.AuthProvider>
// //         </QueryClientProvider>
// //     );
// // };

// // describe('Dashboard Home Page Component', () => {
// //     beforeEach(() => {
// //         vi.clearAllMocks();
// //         mockUseAuthContext.mockReturnValue({ user: { id: 1, name: 'Test User', email: 'test@example.com' }, isLoading: false });
// //         mockUseObjectivesQuery.mockReturnValue({ data: [], isLoading: false, refetch: vi.fn() });
// //     });

// //     // Use the new render helper
// //     it('should display loading state when auth context is loading', () => {
// //         renderDashboardHomeDirectly({ isLoading: true }, {});
// //         // Expect the actual loading text from the component
// //         expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
// //     });

// //     it('should display loading state when objectives query is loading', () => {
// //         renderDashboardHomeDirectly({}, { isLoading: true });
// //         expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
// //     });

// //     it('should render empty state (not "No data" text) when objectives query returns empty data', () => {
// //         renderDashboardHomeDirectly({}, { data: [], isLoading: false });
// //         expect(screen.queryByText(/No data/i)).not.toBeInTheDocument();
// //         expect(screen.getByTestId('data-table-mock')).toBeInTheDocument();
// //         expect(screen.getByText(/Table Mock - Rows: 0/i)).toBeInTheDocument();
// //     });

// //     it('should render graphs and table when data is loaded successfully', async () => {
// //         const mockData: Objetive[] = [{
// //             id: 1, userId: 1, category: 'Test Category', title: 'Objective 1',
// //             description: 'Desc 1', targetValue: 100, currentValue: 50,
// //             deadline: new Date(), status: 'In Progress', unit: 'Units'
// //         }];
// //         renderDashboardHomeDirectly({}, { data: mockData, isLoading: false });

// //         await waitFor(() => {
// //             expect(screen.getByTestId('graph1-mock')).toBeInTheDocument();
// //         });
// //         expect(screen.getByTestId('graph2-mock')).toBeInTheDocument();
// //         expect(screen.getByTestId('graph3-mock')).toBeInTheDocument();
// //         expect(screen.getByTestId('data-table-mock')).toBeInTheDocument();
// //         expect(screen.getByText(/Table Mock - Rows: 1/i)).toBeInTheDocument();
// //     });
// // });
