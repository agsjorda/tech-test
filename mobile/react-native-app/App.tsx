// ─── App root ─────────────────────────────────────────────────────────────────
// QueryClientProvider makes TanStack Query available to every screen.
// AppNavigator handles routing and decides auth vs app stack.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="auto" />
      <AppNavigator />
    </QueryClientProvider>
  );
}
