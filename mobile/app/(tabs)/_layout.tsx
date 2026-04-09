import { useLocale } from '@/contexts/LocaleContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabsLayout() {
  const { colors } = useTheme();
  const { t } = useLocale();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          borderTopColor: colors.tabBarBorder,
        },
        headerTintColor: colors.headerTint,
        headerStyle: { backgroundColor: colors.card },
        headerTitleStyle: { fontWeight: '600', color: colors.foreground },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('tab.home.title'),
          tabBarLabel: t('tab.home.label'),
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t('tab.history.title'),
          tabBarLabel: t('tab.history.label'),
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>📋</Text>,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tab.settings.title'),
          tabBarLabel: t('tab.settings.label'),
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>⚙️</Text>,
        }}
      />
    </Tabs>
  );
}
