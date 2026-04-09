import { useLocale } from '@/contexts/LocaleContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Stack, useRouter } from 'expo-router';
import { Pressable, Text } from 'react-native';

function NewInquiryHeaderButton() {
  const router = useRouter();
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => router.push('/support-inquiry/compose')}
      style={{ paddingHorizontal: 14, paddingVertical: 8 }}
      accessibilityLabel={isEn ? 'Create new inquiry' : '새 문의 작성'}
    >
      <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 15 }}>{isEn ? 'New' : '새 문의'}</Text>
    </Pressable>
  );
}

export default function SupportInquiryLayout() {
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.headerTint,
        headerStyle: { backgroundColor: colors.card },
        headerTitleStyle: { fontWeight: '600', color: colors.foreground },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: isEn ? 'Inquiries' : '문의',
          headerRight: () => <NewInquiryHeaderButton />,
        }}
      />
      <Stack.Screen name="compose" options={{ title: isEn ? 'Write Inquiry' : '문의하기' }} />
    </Stack>
  );
}
