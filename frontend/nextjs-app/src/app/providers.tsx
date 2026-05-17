'use client';

// ─── TanStack Query provider ───────────────────────────────────────────────────
// TanStack Query (formerly React Query) manages all server state in this app —
// fetching, caching, refetching, and synchronising data from the Laravel API.
//
// QueryClientProvider must wrap the whole app so every component can call
// useQuery / useMutation hooks without passing the client down as a prop.
// It lives here (a client component) so the layout.tsx can stay a server component.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  // useState with a factory function ensures one QueryClient is created per
  // browser session. If we used a module-level variable instead, the client
  // would be shared across server-side renders and requests, causing data leaks.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data is considered "fresh" for 30 seconds — within that window,
            // navigating back to a page won't trigger a new API request.
            staleTime: 30_000,
            // Retry once on failure before showing an error (e.g. brief network blip)
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
