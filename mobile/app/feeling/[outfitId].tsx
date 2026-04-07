import { useAuth } from '@/contexts/AuthContext';
import { FEELING_OPTIONS } from '@/lib/options';
import { getSupabase } from '@/lib/supabase';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const STEPS: { key: 'first' | 'middle' | 'last'; title: string }[] = [
  { key: 'first', title: '출발 직후' },
  { key: 'middle', title: '중간 (점심·이동)' },
  { key: 'last', title: '귀가 후' },
];

export default function FeelingScreen() {
  const { outfitId } = useLocalSearchParams<{ outfitId: string }>();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [feeling, setFeeling] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const timing = STEPS[step].key;

  async function saveStep(advance: boolean) {
    if (!user || !outfitId) return;
    if (!feeling) {
      Alert.alert('선택', '체감을 선택해 주세요.');
      return;
    }
    const sb = getSupabase();
    if (!sb) return;
    setBusy(true);
    const { error } = await sb.from('feedback_logs').upsert(
      {
        outfit_log_id: outfitId,
        user_id: user.id,
        timing_type: timing,
        feeling_type: feeling,
        discomfort_tags: [],
        note: note.trim() || null,
      },
      { onConflict: 'outfit_log_id,timing_type' }
    );
    setBusy(false);
    if (error) {
      Alert.alert('오류', error.message);
      return;
    }
    if (advance && step < STEPS.length - 1) {
      setStep(step + 1);
      setFeeling(null);
      setNote('');
    } else {
      Alert.alert('완료', '감상이 저장되었습니다.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.step}>
        {step + 1} / {STEPS.length} · {STEPS[step].title}
      </Text>
      <Text style={styles.h}>체감</Text>
      {FEELING_OPTIONS.map((f) => (
        <Pressable
          key={f}
          style={[styles.opt, feeling === f && styles.optOn]}
          onPress={() => setFeeling(f)}
        >
          <Text style={[styles.optTxt, feeling === f && styles.optTxtOn]}>{f}</Text>
        </Pressable>
      ))}
      <Text style={styles.h}>메모</Text>
      <TextInput style={styles.memo} multiline value={note} onChangeText={setNote} />

      <View style={styles.row}>
        <Pressable
          style={[styles.btn, styles.btnGhost]}
          onPress={() => saveStep(false)}
          disabled={busy}
        >
          <Text style={styles.btnGhostTxt}>이 단계만 저장</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={() => saveStep(true)} disabled={busy}>
          <Text style={styles.btnTxt}>{step < STEPS.length - 1 ? '다음' : '완료'}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 40 },
  step: { fontSize: 16, fontWeight: '700', marginBottom: 16, color: '#0f766e' },
  h: { fontWeight: '700', marginTop: 12, marginBottom: 8 },
  opt: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#f4f4f5',
    marginBottom: 8,
  },
  optOn: { backgroundColor: '#ccfbf1' },
  optTxt: { fontSize: 15, color: '#333' },
  optTxtOn: { color: '#0f766e', fontWeight: '600' },
  memo: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    minHeight: 80,
    padding: 12,
    textAlignVertical: 'top',
  },
  row: { flexDirection: 'row', gap: 12, marginTop: 24 },
  btn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#0d9488', alignItems: 'center' },
  btnTxt: { color: '#fff', fontWeight: '700' },
  btnGhost: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#0d9488' },
  btnGhostTxt: { color: '#0d9488', fontWeight: '600' },
});
