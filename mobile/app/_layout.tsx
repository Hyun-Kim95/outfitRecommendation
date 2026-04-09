import { AuthProvider } from '@/contexts/AuthContext';
import { LocaleProvider, useLocale } from '@/contexts/LocaleContext';
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
  const { t } = useLocale();

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
        <Stack.Screen name="setup" options={{ title: t('stack.setup') }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="outfit/new" options={{ title: t('stack.outfit.new') }} />
        <Stack.Screen name="outfit/edit/[id]" options={{ title: t('stack.outfit.edit') }} />
        <Stack.Screen name="outfit/[id]" options={{ title: t('stack.outfit.detail') }} />
        <Stack.Screen name="favorites" options={{ title: t('stack.favorites') }} />
        <Stack.Screen name="legal/terms" options={{ title: t('stack.terms') }} />
        <Stack.Screen name="legal/privacy" options={{ title: t('stack.privacy') }} />
        <Stack.Screen name="feeling/[outfitId]" options={{ title: t('stack.feeling') }} />
        <Stack.Screen name="similar/index" options={{ title: t('stack.similar') }} />
        <Stack.Screen name="insights/index" options={{ title: t('stack.insights') }} />
        <Stack.Screen name="edit-profile" options={{ title: t('stack.profile.edit') }} />
        <Stack.Screen name="support-inquiry" options={{ headerShown: false }} />
        <Stack.Screen name="app-notices" options={{ title: t('stack.notices') }} />
        <Stack.Screen name="my-inquiries" options={{ headerShown: false }} />
        <Stack.Screen name="my-inquiry/[id]" options={{ title: t('stack.inquiry.detail') }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [client] = useState(() => qc);

  return (
    <QueryClientProvider client={client}>
      <LocaleProvider>
      <ThemeProvider>
        <AuthProvider>
          <NavigationTree />
        </AuthProvider>
      </ThemeProvider>
      </LocaleProvider>
    </QueryClientProvider>
  );
}
