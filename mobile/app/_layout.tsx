import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';

const qc = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000 },
  },
});

function NavigationTree() {
  const { colors, resolvedScheme } = useTheme();

  return (
    <>
      <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerTintColor: colors.headerTint,
          headerStyle: { backgroundColor: colors.card },
          headerTitleStyle: { fontWeight: '600', color: colors.foreground },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="setup" options={{ title: '환경 설정 안내' }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="outfit/new" options={{ title: '착장 기록' }} />
        <Stack.Screen name="outfit/edit/[id]" options={{ title: '착장 수정' }} />
        <Stack.Screen name="outfit/[id]" options={{ title: '착장 상세' }} />
        <Stack.Screen name="favorites" options={{ title: '즐겨찾기' }} />
        <Stack.Screen name="legal/terms" options={{ title: '이용약관' }} />
        <Stack.Screen name="legal/privacy" options={{ title: '개인정보 처리방침' }} />
        <Stack.Screen name="feeling/[outfitId]" options={{ title: '감상 기록' }} />
        <Stack.Screen name="similar/index" options={{ title: '비슷한 날' }} />
        <Stack.Screen name="insights/index" options={{ title: '통계·분석' }} />
        <Stack.Screen name="edit-profile" options={{ title: '프로필 수정' }} />
        <Stack.Screen name="support-inquiry" options={{ headerShown: false }} />
        <Stack.Screen name="app-notices" options={{ title: '공지사항' }} />
        <Stack.Screen name="my-inquiries" options={{ headerShown: false }} />
        <Stack.Screen name="my-inquiry/[id]" options={{ title: '문의 상세' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [client] = useState(() => qc);

  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <AuthProvider>
          <NavigationTree />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
