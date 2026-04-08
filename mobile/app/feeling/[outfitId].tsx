import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { FEELING_OPTIONS, IMPROVEMENT_TAGS } from '@/lib/options';
import { getPrimaryCoords } from '@/lib/profileCompat';
import type { ThemeColors } from '@/lib/theme-colors';
import type { Database, Json } from '@/lib/database.types';
import { getSupabase } from '@/lib/supabase';
import { fetchOpenMeteoSnapshot } from '@/lib/weather';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type FeedbackRow = Database['public']['Tables']['feedback_logs']['Row'];
type TimingSlot = 'first' | 'middle' | 'last';

const TIMING_LABELS: Record<TimingSlot, string> = {
  first: '출발 직후',
  middle: '중간',
  last: '귀가 후',
};

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    scroll: { padding: 16, paddingBottom: 40, backgroundColor: c.background },
    progress: { flexDirection: 'row', gap: 6, marginBottom: 16 },
    dot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: c.muted },
    dotOn: { backgroundColor: c.primary },
    stepTitle: { fontSize: 20, fontWeight: '800', color: c.foreground, marginBottom: 6 },
    stepHint: { fontSize: 14, color: c.mutedForeground, marginBottom: 16 },
    wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 16,
      backgroundColor: c.chipBg,
    },
    chipOn: { backgroundColor: c.chipOnBg },
    chipTxt: { color: c.chipText, fontSize: 14 },
    chipTxtOn: { color: c.chipTextOn, fontWeight: '600' },
    timingBig: {
      width: '100%',
      paddingVertical: 16,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: c.muted,
      marginBottom: 10,
    },
    timingBigOn: { backgroundColor: c.chipOnBg },
    timingBigTxt: { fontSize: 16, color: c.foreground, fontWeight: '600' },
    timingBigTxtOn: { color: c.chipTextOn },
    btn: { marginTop: 20, padding: 16, borderRadius: 12, backgroundColor: c.primary, alignItems: 'center' },
    btnTxt: { color: c.primaryForeground, fontWeight: '700', fontSize: 16 },
    btnGhost: {
      marginTop: 10,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.primary,
      alignItems: 'center',
    },
    btnGhostTxt: { color: c.primary, fontWeight: '600' },
    memo: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 10,
      minHeight: 72,
      padding: 12,
      textAlignVertical: 'top',
      backgroundColor: c.inputBg,
      color: c.foreground,
    },
    card: {
      padding: 12,
      borderRadius: 10,
      backgroundColor: c.card,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: c.inputBorder,
    },
    cardMeta: { fontSize: 12, color: c.mutedForeground, marginBottom: 4 },
    cardBody: { fontSize: 14, color: c.foreground },
    cardActions: { flexDirection: 'row', gap: 16, marginTop: 10 },
    actionTxt: { color: c.primary, fontWeight: '600', fontSize: 14 },
    actionDanger: { color: c.destructive },
    sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8, color: c.primary },
    starsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    starHit: { paddingHorizontal: 4 },
    hint: { fontSize: 13, color: c.mutedForeground, marginBottom: 12 },
  });
}

function weatherSnapshotForInsert(
  snap: Awaited<ReturnType<typeof fetchOpenMeteoSnapshot>>,
  regionLabel: string
): Json {
  return {
    fetched_at: new Date().toISOString(),
    region_label: regionLabel,
    temperature_current: snap.temperature_current,
    temperature_feels_like: snap.temperature_feels_like,
    temperature_min: snap.temperature_min,
    temperature_max: snap.temperature_max,
    humidity: snap.humidity,
    wind_speed: snap.wind_speed,
    precipitation_probability: snap.precipitation_probability,
    precipitation_type: snap.precipitation_type,
    weather_condition: snap.weather_condition,
  } satisfies Record<string, Json>;
}

function formatFeedbackWhen(r: FeedbackRow): string {
  try {
    const d = new Date(r.created_at);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return '';
  }
}

function timingLabelFromRow(r: FeedbackRow): string {
  if (r.timing_type === 'first') return TIMING_LABELS.first;
  if (r.timing_type === 'middle') return TIMING_LABELS.middle;
  if (r.timing_type === 'last') return TIMING_LABELS.last;
  if (r.time_period) return r.time_period;
  return '';
}

function summarizeFeedbackLine(r: FeedbackRow): string {
  const parts: string[] = [];
  const t = timingLabelFromRow(r);
  if (t) parts.push(t);
  if (r.context_mode === 'transit' && r.transport_type) parts.push(`이동: ${r.transport_type}`);
  if (r.context_mode === 'place' && r.place_singular) parts.push(r.place_singular);
  if (r.feeling_type) parts.push(r.feeling_type);
  if (r.overall_satisfaction != null) parts.push(`만족 ${r.overall_satisfaction}/5`);
  return parts.join(' · ') || '감상';
}

function improvementListFromRow(r: FeedbackRow): string[] {
  const t = r.improvement_tags;
  if (!Array.isArray(t)) return [];
  return t.filter((x): x is string => typeof x === 'string');
}

function applyRowToWizard(r: FeedbackRow) {
  let slot: TimingSlot = 'middle';
  if (r.timing_type === 'first' || r.timing_type === 'middle' || r.timing_type === 'last') {
    slot = r.timing_type;
  }
  return {
    timing: slot,
    feeling: r.feeling_type,
    note: r.note ?? '',
    overallSat: r.overall_satisfaction,
    improvements: improvementListFromRow(r),
  };
}

function SatisfactionStars({
  value,
  onPick,
}: {
  value: number | null;
  onPick: (n: number) => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onPick(n)} style={styles.starHit}>
          <Text style={{ fontSize: 28, color: n <= (value ?? 0) ? colors.star : colors.starEmpty }}>★</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function FeelingScreen() {
  const { outfitId } = useLocalSearchParams<{ outfitId: string }>();
  const { user, profile } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [timing, setTiming] = useState<TimingSlot | null>(null);
  const [feeling, setFeeling] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [overallSat, setOverallSat] = useState<number | null>(null);
  const [improvements, setImprovements] = useState<string[]>([]);
  const [history, setHistory] = useState<FeedbackRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadingList, setLoadingList] = useState(true);

  const loadHistory = useCallback(async () => {
    if (!user?.id || !outfitId) {
      setHistory([]);
      setLoadingList(false);
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      setLoadingList(false);
      return;
    }
    const { data, error } = await sb
      .from('feedback_logs')
      .select('*')
      .eq('outfit_log_id', outfitId)
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('feedback list', error.message);
      setHistory([]);
    } else {
      setHistory((data as FeedbackRow[]) ?? []);
    }
    setLoadingList(false);
  }, [user?.id, outfitId]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  function resetForm() {
    setEditingId(null);
    setWizardStep(1);
    setTiming(null);
    setFeeling(null);
    setNote('');
    setOverallSat(null);
    setImprovements([]);
  }

  function startEdit(r: FeedbackRow) {
    const w = applyRowToWizard(r);
    setEditingId(r.id);
    setTiming(w.timing);
    setFeeling(w.feeling ?? null);
    setNote(w.note);
    setOverallSat(w.overallSat);
    setImprovements(w.improvements);
    setWizardStep(1);
  }

  function toggleImprovement(tag: string) {
    setImprovements((prev) =>
      prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag]
    );
  }

  function confirmDelete(id: string) {
    Alert.alert('삭제', '이 감상 기록을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => void deleteFeedback(id),
      },
    ]);
  }

  async function deleteFeedback(id: string) {
    if (!user) return;
    const sb = getSupabase();
    if (!sb) return;
    setBusy(true);
    const { error } = await sb.from('feedback_logs').delete().eq('id', id).eq('user_id', user.id);
    setBusy(false);
    if (error) {
      Alert.alert('오류', error.message);
      return;
    }
    if (editingId === id) resetForm();
    void loadHistory();
  }

  const timePeriodFromTiming = (slot: TimingSlot): string => {
    if (slot === 'first') return '아침';
    if (slot === 'middle') return '점심';
    return '저녁';
  };

  async function save() {
    if (!user || !outfitId) return;
    if (!timing) {
      Alert.alert('선택', '언제의 감상인지 골라 주세요.');
      return;
    }
    if (!feeling) {
      Alert.alert('선택', '체감을 골라 주세요.');
      return;
    }
    if (overallSat == null) {
      Alert.alert('선택', '만족도를 별로 표시해 주세요.');
      return;
    }

    const sb = getSupabase();
    if (!sb) return;
    setBusy(true);

    const { lat, lng, label } = getPrimaryCoords(profile);
    let weatherJson: Json | null = null;
    try {
      const snap = await fetchOpenMeteoSnapshot(lat, lng, label);
      weatherJson = weatherSnapshotForInsert(snap, label);
    } catch (e) {
      console.warn('weather at feedback save', e);
    }

    const payload = {
      timing_type: timing,
      time_period: timePeriodFromTiming(timing),
      context_mode: null,
      transport_type: null,
      place_singular: null,
      place_tags: null,
      feeling_type: feeling,
      discomfort_tags: [] as unknown as Json,
      note: note.trim() || null,
      weather_snapshot: weatherJson,
      overall_satisfaction: overallSat,
      improvement_tags: improvements.length > 0 ? improvements : [],
    };

    const isEdit = !!editingId;
    const { error } = isEdit
      ? await sb.from('feedback_logs').update(payload).eq('id', editingId).eq('user_id', user.id)
      : await sb.from('feedback_logs').insert({
          outfit_log_id: outfitId,
          user_id: user.id,
          ...payload,
        });

    setBusy(false);
    if (error) {
      Alert.alert('오류', error.message);
      return;
    }

    resetForm();
    void loadHistory();
    Alert.alert('완료', isEdit ? '감상이 수정되었습니다.' : '감상이 저장되었습니다.');
  }

  const goNext = () => {
    if (wizardStep === 1 && !timing) {
      Alert.alert('선택', '타이밍을 골라 주세요.');
      return;
    }
    if (wizardStep === 2 && !feeling) {
      Alert.alert('선택', '체감을 골라 주세요.');
      return;
    }
    if (wizardStep < 3) setWizardStep((s) => (s + 1) as 1 | 2 | 3);
  };

  const goBack = () => {
    if (wizardStep > 1) setWizardStep((s) => (s - 1) as 1 | 2 | 3);
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.sectionTitle}>이 코디에 남긴 감상</Text>
      {loadingList ? (
        <Text style={styles.hint}>불러오는 중…</Text>
      ) : history.length === 0 ? (
        <Text style={styles.hint}>아직 기록이 없습니다.</Text>
      ) : (
        history.map((r) => (
          <View key={r.id} style={styles.card}>
            <Text style={styles.cardMeta}>{formatFeedbackWhen(r)}</Text>
            <Text style={styles.cardBody}>{summarizeFeedbackLine(r)}</Text>
            {r.note ? <Text style={[styles.hint, { marginTop: 6 }]}>{r.note}</Text> : null}
            <View style={styles.cardActions}>
              <Pressable onPress={() => startEdit(r)} disabled={busy}>
                <Text style={styles.actionTxt}>수정</Text>
              </Pressable>
              <Pressable onPress={() => confirmDelete(r.id)} disabled={busy}>
                <Text style={[styles.actionTxt, styles.actionDanger]}>삭제</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}

      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
        {editingId ? '감상 수정' : '새 감상'}
      </Text>

      <View style={styles.progress}>
        <View style={[styles.dot, wizardStep >= 1 && styles.dotOn]} />
        <View style={[styles.dot, wizardStep >= 2 && styles.dotOn]} />
        <View style={[styles.dot, wizardStep >= 3 && styles.dotOn]} />
      </View>

      {wizardStep === 1 ? (
        <>
          <Text style={styles.stepTitle}>1 · 언제의 감상인가요?</Text>
          <Text style={styles.stepHint}>한 가지만 선택하면 됩니다.</Text>
          {(Object.keys(TIMING_LABELS) as TimingSlot[]).map((slot) => (
            <Pressable
              key={slot}
              style={[styles.timingBig, timing === slot && styles.timingBigOn]}
              onPress={() => setTiming(slot)}
            >
              <Text style={[styles.timingBigTxt, timing === slot && styles.timingBigTxtOn]}>
                {TIMING_LABELS[slot]}
              </Text>
            </Pressable>
          ))}
        </>
      ) : null}

      {wizardStep === 2 ? (
        <>
          <Text style={styles.stepTitle}>2 · 체감은 어땠나요?</Text>
          <Text style={styles.stepHint}>가장 가까운 것을 고르세요.</Text>
          <View style={styles.wrap}>
            {FEELING_OPTIONS.map((f) => (
              <Pressable
                key={f}
                style={[styles.chip, feeling === f && styles.chipOn]}
                onPress={() => setFeeling(f)}
              >
                <Text style={[styles.chipTxt, feeling === f && styles.chipTxtOn]}>{f}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      {wizardStep === 3 ? (
        <>
          <Text style={styles.stepTitle}>3 · 만족도와 메모</Text>
          <Text style={styles.stepHint}>별은 필수, 나머지는 선택입니다.</Text>
          <Text style={[styles.stepHint, { marginBottom: 8 }]}>전체 만족도</Text>
          <SatisfactionStars value={overallSat} onPick={setOverallSat} />

          <Text style={[styles.stepHint, { marginTop: 16, marginBottom: 8 }]}>개선이 필요했던 점 (선택)</Text>
          <View style={styles.wrap}>
            {IMPROVEMENT_TAGS.map((t) => (
              <Pressable
                key={t}
                style={[styles.chip, improvements.includes(t) && styles.chipOn]}
                onPress={() => toggleImprovement(t)}
              >
                <Text style={[styles.chipTxt, improvements.includes(t) && styles.chipTxtOn]}>{t}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.stepHint, { marginTop: 16, marginBottom: 8 }]}>메모 (선택)</Text>
          <TextInput
            style={styles.memo}
            multiline
            value={note}
            onChangeText={setNote}
            placeholder="한 줄이면 충분해요"
            placeholderTextColor={colors.mutedForeground}
          />

          <Pressable style={styles.btn} onPress={() => void save()} disabled={busy}>
            <Text style={styles.btnTxt}>{busy ? '저장 중…' : editingId ? '변경 저장' : '저장'}</Text>
          </Pressable>
          <Pressable style={styles.btnGhost} onPress={goBack} disabled={busy}>
            <Text style={styles.btnGhostTxt}>이전 단계</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Pressable style={styles.btn} onPress={goNext} disabled={busy}>
            <Text style={styles.btnTxt}>{wizardStep === 2 ? '다음 (만족도)' : '다음'}</Text>
          </Pressable>
          {wizardStep === 2 ? (
            <Pressable style={styles.btnGhost} onPress={goBack} disabled={busy}>
              <Text style={styles.btnGhostTxt}>이전 단계</Text>
            </Pressable>
          ) : null}
          {editingId && wizardStep === 1 ? (
            <Pressable style={styles.btnGhost} onPress={resetForm} disabled={busy}>
              <Text style={styles.btnGhostTxt}>수정 취소</Text>
            </Pressable>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}
