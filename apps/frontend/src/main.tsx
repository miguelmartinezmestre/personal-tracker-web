// import { StrictMode } from 'react';
import './index.css';
import { createRoot } from 'react-dom/client';
import { routeTree } from './routeTree.gen.ts';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import NotFound from './components/not-found.tsx';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './providers/theme-provider.tsx';
import './i18n';
import { Toaster } from './components/ui/sonner';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { AppRouter } from '../../backend/src/routers/app.router.ts';
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query';


export const baseUrl = 'http://localhost:3000';



const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // staleTime: 1000 * 60,
            // gcTime: 1000 * 60,
        },
    },
});

// function makeQueryClient() {
//     return new QueryClient({
//       defaultOptions: {
//         queries: {
//           // With SSR, we usually want to set some default staleTime
//           // above 0 to avoid refetching immediately on the client
//           staleTime: 60 * 1000,
//         },
//       },
//     });
//   }
//   let browserQueryClient: QueryClient | undefined = undefined;
//   function getQueryClient() {
//     if (typeof window === 'undefined') {
//       // Server: always make a new query client
//       return makeQueryClient();
//     } else {
//       // Browser: make a new query client if we don't already have one
//       // This is very important, so we don't re-make a new client if React
//       // suspends during the initial render. This may not be needed if we
//       // have a suspense boundary BELOW the creation of the query client
//       if (!browserQueryClient) browserQueryClient = makeQueryClient();
//       return browserQueryClient;
//     }
//   }

  export const trpc = createTRPCOptionsProxy<AppRouter>({
    client: createTRPCClient({
      links: [
        httpBatchLink({
          url: 'http://localhost:3000/trpc',
        }),
      ],
    }),
    queryClient,
  })

const router = createRouter({
    routeTree,
    defaultNotFoundComponent: () => <NotFound />,
    defaultPreload: 'intent',
    context: {
      trpc: trpc,
      queryClient: queryClient,
    },
    Wrap: function WrapComponent({ children }) {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      )
    },
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>
  }
}

function App() {
  // const queryClient = getQueryClient();
  // const [trpcClient] = useState(() =>
  //   createTRPCClient<AppRouter>({
  //     links: [
  //       httpBatchLink({
  //         url: 'http://localhost:3000/trpc',
  //       }),
  //     ],
  //   }),
  // );

  // const trpc = useTRPC();

  return (
      // <StrictMode>
      // <QueryClientProvider client={queryClient}>
      //     <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
              <ThemeProvider>
                  <RouterProvider router={router} context={{ trpc }}/>
                  <Toaster />
              </ThemeProvider>
      //     </TRPCProvider>
      // </QueryClientProvider>
      // </StrictMode>
  );
}

createRoot(document.getElementById('root') || document.createElement('div')).render(<App />);
