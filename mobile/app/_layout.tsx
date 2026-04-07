import { AuthProvider } from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';

const qc = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000 },
  },
});

export default function RootLayout() {
  const [client] = useState(() => qc);

  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerTintColor: '#0f766e',
            headerTitleStyle: { fontWeight: '600' },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}
