import { Stack } from 'expo-router';
import { useLocale } from '@/contexts/LocaleContext';

export default function OnboardingLayout() {
  const { locale } = useLocale();
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        title: locale === 'en' ? 'Get started' : '시작하기',
        headerTintColor: '#0f766e',
      }}
    />
  );
}
