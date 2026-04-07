import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        title: '시작하기',
        headerTintColor: '#0f766e',
      }}
    />
  );
}
