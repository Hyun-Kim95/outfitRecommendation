import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  getActivityRegionsFromProfile,
  getDefaultTransportsFromProfile,
  summarizeRegionLabels,
} from '@/lib/profileCompat';
import { SENSITIVITY_OPTIONS, TRANSPORT_OPTIONS } from '@/lib/options';
import { PRESET_REGIONS } from '@/lib/regions';
import type { ThemeColors } from '@/lib/theme-colors';
import { getSupabase } from '@/lib/supabase';
import { useEffect, useMemo, useState } from 'react';
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

const MAX_REGIONS = 3;

export type ProfileEditorMode = 'onboarding' | 'edit';

type Props = {
  mode: ProfileEditorMode;
  /** 설정 화면 재진입 시 폼을 프로필과 다시 맞출 때 증가 */
  syncNonce?: number;
  onSaved: () => void;
};

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    scroll: { padding: 20, paddingBottom: 40, backgroundColor: c.background },
    label: { fontSize: 14, fontWeight: '600', marginTop: 16, marginBottom: 8, color: c.foreground },
    input: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 10,
      padding: 12,
      backgroundColor: c.inputBg,
      fontSize: 16,
      color: c.foreground,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 20,
    },
    rowBlock: { marginTop: 20 },
    rowLabel: { fontSize: 16, color: c.foreground, flex: 1, marginRight: 12 },
    hint: { fontSize: 12, color: c.mutedForeground, marginTop: 6, lineHeight: 18 },
    chips: { flexDirection: 'row', gap: 8 },
    wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 20,
      backgroundColor: c.chipBg,
    },
    chipOn: { backgroundColor: c.chipOnBg },
    chipText: { color: c.chipText },
    chipTextOn: { color: c.chipTextOn, fontWeight: '600' },
    chipDisabled: { opacity: 0.4 },
    button: {
      marginTop: 32,
      backgroundColor: c.primary,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    buttonText: { color: c.primaryForeground, fontWeight: '700', fontSize: 16 },
  });
}

export function ProfileEditorForm({ mode, syncNonce = 0, onSaved }: Props) {
  const { user, profile, refreshProfile } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [nickname, setNickname] = useState('');
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>(['seoul']);
  const [cold, setCold] = useState<'low' | 'normal' | 'high'>('normal');
  const [heat, setHeat] = useState<'low' | 'normal' | 'high'>('normal');
  const [selectedTransports, setSelectedTransports] = useState<string[]>(['지하철']);
  const [commute, setCommute] = useState(false);
  const [notify, setNotify] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(false);
  }, [user?.id, syncNonce]);

  useEffect(() => {
    if (!profile || hydrated) return;
    if (profile.nickname) setNickname(profile.nickname);
    const regs = getActivityRegionsFromProfile(profile);
    const fromPresets = regs
      .map((r) => r.slug)
      .filter((s) => PRESET_REGIONS.some((p) => p.slug === s));
    if (fromPresets.length > 0) {
      setSelectedSlugs(fromPresets.slice(0, MAX_REGIONS));
    }
    const ts = getDefaultTransportsFromProfile(profile);
    if (ts.length > 0) setSelectedTransports(ts);
    if (profile.cold_sensitivity === 'low' || profile.cold_sensitivity === 'high' || profile.cold_sensitivity === 'normal') {
      setCold(profile.cold_sensitivity);
    }
    if (profile.heat_sensitivity === 'low' || profile.heat_sensitivity === 'high' || profile.heat_sensitivity === 'normal') {
      setHeat(profile.heat_sensitivity);
    }
    setCommute(Boolean(profile.commute_student));
    setNotify(Boolean(profile.notifications_enabled));
    setHydrated(true);
  }, [profile, hydrated]);

  function toggleRegion(slug: string) {
    setSelectedSlugs((prev) => {
      if (prev.includes(slug)) {
        const next = prev.filter((s) => s !== slug);
        return next.length === 0 ? prev : next;
      }
      if (prev.length >= MAX_REGIONS) {
        Alert.alert('주 활동 지역', `최대 ${MAX_REGIONS}곳까지 선택할 수 있어요.`);
        return prev;
      }
      return [...prev, slug];
    });
  }

  function toggleTransport(t: string) {
    setSelectedTransports((prev) => {
      if (prev.includes(t)) {
        const next = prev.filter((x) => x !== t);
        return next.length === 0 ? prev : next;
      }
      return [...prev, t];
    });
  }

  async function save() {
    if (!nickname.trim()) {
      Alert.alert('닉네임', '닉네임을 입력해 주세요.');
      return;
    }
    const presets = PRESET_REGIONS.filter((p) => selectedSlugs.includes(p.slug));
    if (presets.length === 0) {
      Alert.alert('주 활동 지역', '최소 1곳을 선택해 주세요.');
      return;
    }
    if (!user) return;

    const sb = getSupabase();
    if (!sb) return;

    const first = presets[0];
    const summaryLabel = summarizeRegionLabels(presets);
    const activity_regions = presets.map((p) => ({
      slug: p.slug,
      label: p.label,
      lat: p.lat,
      lng: p.lng,
    }));

    const base = {
      nickname: nickname.trim(),
      default_region: summaryLabel,
      default_lat: first.lat,
      default_lng: first.lng,
      activity_regions,
      cold_sensitivity: cold,
      heat_sensitivity: heat,
      default_transports: selectedTransports,
      default_transport: selectedTransports[0] ?? null,
      commute_student: commute,
      notifications_enabled: notify,
    };

    setBusy(true);
    const { error } = await sb
      .from('profiles')
      .update({
        ...base,
        ...(mode === 'onboarding' ? { onboarding_completed: true } : {}),
      })
      .eq('id', user.id);

    setBusy(false);

    if (error) {
      Alert.alert('저장 실패', error.message);
      return;
    }

    await refreshProfile();
    onSaved();
  }

  const submitLabel =
    mode === 'onboarding' ? (busy ? '저장 중…' : '완료하고 시작') : busy ? '저장 중…' : '저장';

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.label}>닉네임 *</Text>
      <TextInput
        style={styles.input}
        value={nickname}
        onChangeText={setNickname}
        placeholder="표시 이름"
        placeholderTextColor={colors.mutedForeground}
      />

      <Text style={styles.label}>주 활동 지역 (최대 {MAX_REGIONS}곳)</Text>
      <Text style={styles.hint}>
        선택한 곳마다 오늘 날씨를 불러와 홈에 표시합니다. 집·직장·자주 가는 동네 등을 고르세요.
      </Text>
      <View style={styles.wrap}>
        {PRESET_REGIONS.map((p) => {
          const on = selectedSlugs.includes(p.slug);
          const disabled = !on && selectedSlugs.length >= MAX_REGIONS;
          return (
            <Pressable
              key={p.slug}
              style={[styles.chip, on && styles.chipOn, disabled && styles.chipDisabled]}
              onPress={() => toggleRegion(p.slug)}
              disabled={disabled}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{p.label}</Text>
            </Pressable>
          );
        })}
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

      <Text style={styles.label}>주로 쓰는 이동 수단 (복수 선택)</Text>
      <Text style={styles.hint}>여러 개 선택할 수 있어요. 도보를 포함하면 활동량을 조금 더 높게 반영합니다.</Text>
      <View style={styles.wrap}>
        {TRANSPORT_OPTIONS.map((t) => {
          const on = selectedTransports.includes(t);
          return (
            <Pressable key={t} style={[styles.chip, on && styles.chipOn]} onPress={() => toggleTransport(t)}>
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{t}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.rowBlock}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>출근·등교가 잦아요</Text>
          <Switch
            value={commute}
            onValueChange={setCommute}
            trackColor={{ false: colors.muted, true: colors.accent }}
            thumbColor={colors.card}
          />
        </View>
        <Text style={styles.hint}>
          직장·학교로 매일 이동하는 패턴임을 프로필에 남깁니다. 이후 기록·추천에서 &quot;출근&quot;·&quot;등교&quot; 같은 상황과 맞출 때
          참고할 수 있어요. (앱이 자동으로 출근 처리하지는 않습니다.)
        </Text>
      </View>

      <View style={styles.rowBlock}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>기록 알림(로컬) 받기</Text>
          <Switch
            value={notify}
            onValueChange={setNotify}
            trackColor={{ false: colors.muted, true: colors.accent }}
            thumbColor={colors.card}
          />
        </View>
        <Text style={styles.hint}>
          이 기기에서만 동작하는 <Text style={{ fontWeight: '600' }}>로컬 알림</Text>
          (예: 감상 기록 리마인더)에 동의합니다. 광고·마케팅 푸시와는 다르며, 설정 화면에서 나중에 바꿀 수 있어요.
        </Text>
      </View>

      <Pressable style={[styles.button, busy && { opacity: 0.7 }]} onPress={save} disabled={busy}>
        <Text style={styles.buttonText}>{submitLabel}</Text>
      </Pressable>
    </ScrollView>
  );
}
