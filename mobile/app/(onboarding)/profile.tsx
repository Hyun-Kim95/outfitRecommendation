import { useAuth } from '@/contexts/AuthContext';
import { getSupabase } from '@/lib/supabase';
import { SENSITIVITY_OPTIONS, TRANSPORT_OPTIONS } from '@/lib/options';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

const SEOUL_LAT = 37.5665;
const SEOUL_LNG = 126.978;

export default function OnboardingProfileScreen() {
  const { user, refreshProfile } = useAuth();
  const [nickname, setNickname] = useState('');
  const [region, setRegion] = useState('서울');
  const [useSeoul, setUseSeoul] = useState(true);
  const [cold, setCold] = useState<'low' | 'normal' | 'high'>('normal');
  const [heat, setHeat] = useState<'low' | 'normal' | 'high'>('normal');
  const [transport, setTransport] = useState('지하철');
  const [commute, setCommute] = useState(false);
  const [notify, setNotify] = useState(false);
  const [busy, setBusy] = useState(false);

  async function complete() {
    if (!nickname.trim()) {
      Alert.alert('닉네임', '닉네임을 입력해 주세요.');
      return;
    }
    if (!user) return;

    const sb = getSupabase();
    if (!sb) return;

    setBusy(true);
    const { error } = await sb
      .from('profiles')
      .update({
        nickname: nickname.trim(),
        default_region: region.trim() || '서울',
        default_lat: useSeoul ? SEOUL_LAT : null,
        default_lng: useSeoul ? SEOUL_LNG : null,
        cold_sensitivity: cold,
        heat_sensitivity: heat,
        default_transport: transport,
        commute_student: commute,
        notifications_enabled: notify,
        onboarding_completed: true,
      })
      .eq('id', user.id);

    setBusy(false);

    if (error) {
      Alert.alert('저장 실패', error.message);
      return;
    }

    await refreshProfile();
    router.replace('/(tabs)/home');
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.label}>닉네임 *</Text>
      <TextInput style={styles.input} value={nickname} onChangeText={setNickname} placeholder="표시 이름" />

      <Text style={styles.label}>주 활동 지역</Text>
      <TextInput style={styles.input} value={region} onChangeText={setRegion} />

      <View style={styles.row}>
        <Text style={styles.rowLabel}>서울 좌표로 날씨 받기</Text>
        <Switch value={useSeoul} onValueChange={setUseSeoul} />
      </View>

      <Text style={styles.label}>추위 민감도</Text>
      <View style={styles.chips}>
        {SENSITIVITY_OPTIONS.map((o) => (
          <Pressable
            key={o.value}
            style={[styles.chip, cold === o.value && styles.chipOn]}
            onPress={() => setCold(o.value)}
          >
            <Text style={[styles.chipText, cold === o.value && styles.chipTextOn]}>{o.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>더위 민감도</Text>
      <View style={styles.chips}>
        {SENSITIVITY_OPTIONS.map((o) => (
          <Pressable
            key={o.value}
            style={[styles.chip, heat === o.value && styles.chipOn]}
            onPress={() => setHeat(o.value)}
          >
            <Text style={[styles.chipText, heat === o.value && styles.chipTextOn]}>{o.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>주 이동 수단</Text>
      <View style={styles.wrap}>
        {TRANSPORT_OPTIONS.map((t) => (
          <Pressable
            key={t}
            style={[styles.chip, transport === t && styles.chipOn]}
            onPress={() => setTransport(t)}
          >
            <Text style={[styles.chipText, transport === t && styles.chipTextOn]}>{t}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.row}>
        <Text style={styles.rowLabel}>출근/등교</Text>
        <Switch value={commute} onValueChange={setCommute} />
      </View>

      <View style={styles.row}>
        <Text style={styles.rowLabel}>알림 수신 동의</Text>
        <Switch value={notify} onValueChange={setNotify} />
      </View>

      <Pressable style={[styles.button, busy && { opacity: 0.7 }]} onPress={complete} disabled={busy}>
        <Text style={styles.buttonText}>{busy ? '저장 중…' : '완료하고 시작'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 16, marginBottom: 8, color: '#333' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  rowLabel: { fontSize: 16, color: '#222' },
  chips: { flexDirection: 'row', gap: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#eee',
  },
  chipOn: { backgroundColor: '#ccfbf1' },
  chipText: { color: '#444' },
  chipTextOn: { color: '#0f766e', fontWeight: '600' },
  button: {
    marginTop: 32,
    backgroundColor: '#0d9488',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
