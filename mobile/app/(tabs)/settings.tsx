import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useTheme } from '@/contexts/ThemeContext';
import { isExpoGoAndroid } from '@/lib/expo-go-notifications';
import { optionLabel } from '@/lib/optionLabels';
import { getDefaultTransportsFromProfile } from '@/lib/profileCompat';
import { formatDefaultRegionForLocale } from '@/lib/regions';
import type { ThemeColors } from '@/lib/theme-colors';
import { getSupabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background, padding: 16 },
    card: {
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: c.border,
    },
    label: { fontSize: 13, color: c.mutedForeground, marginBottom: 4 },
    value: { fontSize: 18, fontWeight: '700', color: c.foreground },
    sub: { marginTop: 4, color: c.mutedForeground },
    btn: {
      marginTop: 12,
      backgroundColor: c.primary,
      padding: 12,
      borderRadius: 10,
      alignItems: 'center',
    },
    btnText: { color: c.primaryForeground, fontWeight: '600' },
    btnOutline: {
      marginTop: 12,
      padding: 12,
      borderRadius: 10,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.primary,
      backgroundColor: 'transparent',
    },
    btnOutlineText: { color: c.primary, fontWeight: '600' },
    hint: { marginTop: 10, fontSize: 12, color: c.mutedForeground, lineHeight: 18 },
    logout: { marginTop: 8, padding: 16, alignItems: 'center' },
    logoutText: { color: c.destructive, fontWeight: '600' },
    themeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    themeChip: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.secondary,
    },
    themeChipOn: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    themeChipText: { fontSize: 13, fontWeight: '600', color: c.secondaryForeground },
    themeChipTextOn: { color: c.primaryForeground },
  });
}

export default function SettingsScreen() {
  const { profile, signOut } = useAuth();
  const { locale, setLocale, t } = useLocale();
  const { colors, preference, setPreference } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const transportLabels = useMemo(() => getDefaultTransportsFromProfile(profile), [profile]);
  const isEn = locale === 'en';
  const [perm, setPerm] = useState<string>('…');

  const refreshPerm = useCallback(async () => {
    if (isExpoGoAndroid()) {
      setPerm(isEn ? 'Not available in Expo Go (Android)' : 'Expo Go(Android)에서는 미지원');
      return;
    }
    const Notifications = await import('expo-notifications');
    const { status } = await Notifications.getPermissionsAsync();
    if (isEn) {
      setPerm(status === 'granted' ? 'Allowed' : status === 'denied' ? 'Denied' : 'Not requested');
    } else {
      setPerm(status === 'granted' ? '허용됨' : status === 'denied' ? '거부됨' : '미요청');
    }
  }, [isEn]);

  useEffect(() => {
    if (isExpoGoAndroid()) {
      setPerm(isEn ? 'Not available in Expo Go (Android)' : 'Expo Go(Android)에서는 미지원');
      return;
    }
    let cancelled = false;
    void import('expo-notifications').then((Notifications) => {
      if (cancelled) return;
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
      void refreshPerm();
    });
    return () => {
      cancelled = true;
    };
  }, [refreshPerm]);

  async function requestPush() {
    if (isExpoGoAndroid()) {
      Alert.alert(
        isEn ? 'Notifications' : '알림',
        isEn
          ? 'Notifications are not available in Expo Go on Android. Use a development build to test.\n\ne.g. npx expo run:android'
          : 'Expo Go(Android)에서는 알림 모듈을 쓸 수 없습니다. 실제 알림을 테스트하려면 개발 빌드를 사용하세요.\n\n예: npx expo run:android'
      );
      return;
    }
    const Notifications = await import('expo-notifications');
    const { status } = await Notifications.requestPermissionsAsync();
    if (isEn) {
      setPerm(status === 'granted' ? 'Allowed' : 'Denied');
    } else {
      setPerm(status === 'granted' ? '허용됨' : '거부됨');
    }
    if (status !== 'granted') {
      Alert.alert(
        isEn ? 'Notifications' : '알림',
        isEn ? 'Please enable notifications in system settings.' : '설정에서 알림을 허용해 주세요.'
      );
      return;
    }
    if (Platform.OS === 'web') {
      Alert.alert(
        isEn ? 'Notifications' : '알림',
        isEn ? 'Local notifications may be limited on the web.' : '웹에서는 로컬 알림이 제한될 수 있습니다.'
      );
      return;
    }
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: isEn ? 'Outfit log' : '착장 기록',
          body: isEn ? 'How did it feel? Leave quick feedback.' : '오늘 기분은 어땠나요? 감상을 남겨보세요.',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 120,
          repeats: false,
        },
      });
      Alert.alert(
        isEn ? 'Notifications' : '알림',
        isEn ? 'A test notification is scheduled in 2 minutes.' : '테스트용 알림을 2분 후로 예약했습니다.'
      );
    } catch (e) {
      Alert.alert(
        isEn ? 'Notifications' : '알림',
        e instanceof Error ? e.message : isEn ? 'Failed to schedule' : '스케줄 실패'
      );
    }
  }

  async function onLogout() {
    await signOut();
    router.replace('/(auth)/sign-in');
  }

  function confirmWithdraw() {
    Alert.alert(
      isEn ? 'Delete account' : '회원 탈퇴',
      isEn
        ? 'Your account will be disabled and you will not be able to use the app. Re-registration with the same email follows our policy. Continue?'
        : '탈퇴하면 계정이 비활성화되어 앱을 사용할 수 없습니다. 동일 이메일로 재가입 정책은 운영 정책에 따릅니다. 계속할까요?',
      [
        { text: isEn ? 'Cancel' : '취소', style: 'cancel' },
        {
          text: isEn ? 'Delete account' : '탈퇴하기',
          style: 'destructive',
          onPress: () => void runWithdraw(),
        },
      ]
    );
  }

  async function runWithdraw() {
    const sb = getSupabase();
    if (!sb) {
      Alert.alert(isEn ? 'Error' : '오류', isEn ? 'Supabase is not configured.' : 'Supabase가 설정되지 않았습니다.');
      return;
    }
    const { error } = await sb.rpc('withdraw_account');
    if (error) {
      Alert.alert(isEn ? 'Error' : '오류', error.message);
      return;
    }
    Alert.alert(
      isEn ? 'Done' : '처리 완료',
      isEn ? 'Your account has been disabled.' : '계정이 비활성화되었습니다.',
      [
        {
          text: isEn ? 'OK' : '확인',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/sign-in');
          },
        },
      ]
    );
  }

  function themeChip(p: 'light' | 'dark', label: string) {
    const on = preference === p;
    return (
      <Pressable
        style={[styles.themeChip, on && styles.themeChipOn]}
        onPress={() => setPreference(p)}
      >
        <Text style={[styles.themeChipText, on && styles.themeChipTextOn]}>{label}</Text>
      </Pressable>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={styles.card}>
        <Text style={styles.label}>{isEn ? 'Profile' : '프로필'}</Text>
        <Text style={styles.value}>{profile?.nickname ?? '—'}</Text>
        <Text style={styles.sub}>
          {profile?.default_region ? formatDefaultRegionForLocale(locale, profile.default_region) : ''}
        </Text>
        {transportLabels.length > 0 ? (
          <Text style={styles.sub}>
            {isEn ? 'Transit: ' : '이동: '}
            {transportLabels.map((x) => optionLabel(locale, x)).join(', ')}
          </Text>
        ) : null}
        <Pressable style={styles.btnOutline} onPress={() => router.push('/edit-profile')}>
          <Text style={styles.btnOutlineText}>{isEn ? 'Edit profile' : '프로필 수정'}</Text>
        </Pressable>
        <Pressable style={styles.btnOutline} onPress={() => router.push('/app-notices')}>
          <Text style={styles.btnOutlineText}>{isEn ? 'Notices' : '공지사항'}</Text>
        </Pressable>
        <Pressable style={styles.btnOutline} onPress={() => router.push('/support-inquiry')}>
          <Text style={styles.btnOutlineText}>{isEn ? 'Contact support' : '문의하기'}</Text>
        </Pressable>
        <Pressable style={styles.btnOutline} onPress={() => router.push('/legal/terms')}>
          <Text style={styles.btnOutlineText}>{isEn ? 'Terms of Service' : '이용약관'}</Text>
        </Pressable>
        <Pressable style={styles.btnOutline} onPress={() => router.push('/legal/privacy')}>
          <Text style={styles.btnOutlineText}>{isEn ? 'Privacy Policy' : '개인정보 처리방침'}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>{t('settings.language')}</Text>
        <Text style={styles.sub}>{t('settings.language.hint')}</Text>
        <View style={styles.themeRow}>
          <Pressable
            style={[styles.themeChip, locale === 'ko' && styles.themeChipOn]}
            onPress={() => setLocale('ko')}
          >
            <Text style={[styles.themeChipText, locale === 'ko' && styles.themeChipTextOn]}>
              {t('settings.language.ko')}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.themeChip, locale === 'en' && styles.themeChipOn]}
            onPress={() => setLocale('en')}
          >
            <Text style={[styles.themeChipText, locale === 'en' && styles.themeChipTextOn]}>
              {t('settings.language.en')}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>{isEn ? 'Appearance' : '화면 테마'}</Text>
        <Text style={styles.sub}>
          {isEn
            ? 'By default the app follows your device. Choosing Light or Dark keeps that mode fixed.'
            : '처음에는 기기(시스템) 설정을 따릅니다. 라이트 또는 다크를 고르면 그대로 고정됩니다.'}
        </Text>
        <View style={styles.themeRow}>
          {themeChip('light', isEn ? 'Light' : '라이트')}
          {themeChip('dark', isEn ? 'Dark' : '다크')}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>{isEn ? 'Notification permission' : '알림 권한'}</Text>
        <Text style={styles.value}>{perm}</Text>
        <Pressable style={styles.btn} onPress={requestPush}>
          <Text style={styles.btnText}>
            {isEn ? 'Request permission · test in 2 min' : '권한 요청 · 테스트 알림(2분 후)'}
          </Text>
        </Pressable>
        <Text style={styles.hint}>
          {isEn
            ? 'Periodic push in production will use EAS·FCM/APNs. In MVP we only verify scheduling with local notifications. On Expo Go (Android) the API is unavailable—use a dev build.'
            : 'PRD의 주기적 푸시는 실제 배포 시 EAS·FCM/APNs와 연동합니다. MVP에서는 로컬 예약으로 경로만 검증합니다. Expo Go(Android)는 알림 API가 제외되어 있어 개발 빌드로 확인하세요.'}
        </Text>
      </View>

      <Pressable style={styles.logout} onPress={onLogout}>
        <Text style={styles.logoutText}>{isEn ? 'Log out' : '로그아웃'}</Text>
      </Pressable>

      <Pressable style={[styles.logout, { marginTop: 8 }]} onPress={confirmWithdraw}>
        <Text style={styles.logoutText}>{isEn ? 'Delete account' : '회원 탈퇴'}</Text>
      </Pressable>
    </ScrollView>
  );
}
