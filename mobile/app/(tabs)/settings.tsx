import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function SettingsScreen() {
  const { profile, signOut } = useAuth();
  const [perm, setPerm] = useState<string>('…');

  const refreshPerm = useCallback(async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setPerm(status === 'granted' ? '허용됨' : status === 'denied' ? '거부됨' : '미요청');
  }, []);

  useEffect(() => {
    void refreshPerm();
  }, [refreshPerm]);

  async function requestPush() {
    const { status } = await Notifications.requestPermissionsAsync();
    setPerm(status === 'granted' ? '허용됨' : '거부됨');
    if (status !== 'granted') {
      Alert.alert('알림', '설정에서 알림을 허용해 주세요.');
      return;
    }
    if (Platform.OS === 'web') {
      Alert.alert('알림', '웹에서는 로컬 알림이 제한될 수 있습니다.');
      return;
    }
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '착장 기록',
          body: '오늘 기분은 어땠나요? 감상을 남겨보세요.',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 120,
          repeats: false,
        },
      });
      Alert.alert('알림', '테스트용 알림을 2분 후로 예약했습니다.');
    } catch (e) {
      Alert.alert('알림', e instanceof Error ? e.message : '스케줄 실패');
    }
  }

  async function onLogout() {
    await signOut();
    router.replace('/(auth)/sign-in');
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>프로필</Text>
        <Text style={styles.value}>{profile?.nickname ?? '—'}</Text>
        <Text style={styles.sub}>{profile?.default_region ?? ''}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>알림 권한</Text>
        <Text style={styles.value}>{perm}</Text>
        <Pressable style={styles.btn} onPress={requestPush}>
          <Text style={styles.btnText}>권한 요청 · 테스트 알림(2분 후)</Text>
        </Pressable>
        <Text style={styles.hint}>
          PRD의 주기적 푸시는 실제 배포 시 EAS·FCM/APNs와 연동합니다. MVP에서는 로컬 예약으로 경로만 검증합니다.
        </Text>
      </View>

      <Pressable style={styles.logout} onPress={onLogout}>
        <Text style={styles.logoutText}>로그아웃</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f5', padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  label: { fontSize: 13, color: '#71717a', marginBottom: 4 },
  value: { fontSize: 18, fontWeight: '700', color: '#111' },
  sub: { marginTop: 4, color: '#52525b' },
  btn: {
    marginTop: 12,
    backgroundColor: '#0d9488',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '600' },
  hint: { marginTop: 10, fontSize: 12, color: '#71717a', lineHeight: 18 },
  logout: { marginTop: 8, padding: 16, alignItems: 'center' },
  logoutText: { color: '#b91c1c', fontWeight: '600' },
});
