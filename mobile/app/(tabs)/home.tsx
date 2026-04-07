import { useAuth } from '@/contexts/AuthContext';
import { dateInSeoul } from '@/lib/dates';
import { fetchOutfitsWithRelations } from '@/lib/queries';
import { SITUATION_TAGS } from '@/lib/options';
import { scoreRecommendation, type TodayVector } from '@/lib/similarDays';
import { fetchOpenMeteoSnapshot, formatTempRange } from '@/lib/weather';
import { getSupabase } from '@/lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';


export default function HomeScreen() {
  const { user, profile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weatherLine, setWeatherLine] = useState('');
  const [caution, setCaution] = useState('');
  const [reco, setReco] = useState<
    { id: string; summary: string; reason: string; warning: boolean }[]
  >([]);
  const [quickTags, setQuickTags] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    const sb = getSupabase();
    if (!sb) return;

    setError(null);
    try {
      let lat = profile?.default_lat ?? 37.5665;
      let lng = profile?.default_lng ?? 126.978;
      let regionName = profile?.default_region ?? '서울';

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({});
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        regionName = '현재 위치';
      }

      const snap = await fetchOpenMeteoSnapshot(lat, lng, regionName);
      const today = dateInSeoul();
      const daySpread = snap.temperature_max - snap.temperature_min;

      const { error: wErr } = await sb.from('weather_logs').upsert(
        {
          user_id: user.id,
          snapshot_date: today,
          region_name: regionName,
          temperature_current: snap.temperature_current,
          temperature_feels_like: snap.temperature_feels_like,
          temperature_min: snap.temperature_min,
          temperature_max: snap.temperature_max,
          humidity: snap.humidity,
          wind_speed: snap.wind_speed,
          precipitation_type: snap.precipitation_type,
          precipitation_probability: snap.precipitation_probability,
          weather_condition: snap.weather_condition,
          raw_json: snap.raw_json as never,
        },
        { onConflict: 'user_id,snapshot_date' }
      );

      if (wErr) throw new Error(wErr.message);

      setWeatherLine(
        `${regionName} · ${Math.round(snap.temperature_current)}° (체감 ${Math.round(snap.temperature_feels_like)}°) · ${snap.weather_condition} · ${formatTempRange(snap.temperature_min, snap.temperature_max)}`
      );

      let c = '';
      if (daySpread >= 10) c += `일교차 ${Math.round(daySpread)}° — 레이어드 추천. `;
      if (snap.wind_speed >= 6) c += '바람이 강해 체감이 더 낮을 수 있어요. ';
      if (snap.precipitation_probability > 40) c += '강수 가능성 있음 — 우산·방수 확인. ';
      setCaution(c.trim() || '특별한 주의사항 없음');

      const vec: TodayVector = {
        temperature_current: snap.temperature_current,
        temperature_feels_like: snap.temperature_feels_like,
        humidity: snap.humidity,
        wind_speed: snap.wind_speed,
        precipMatch: snap.precipitation_probability > 30,
        situationTags: quickTags,
        activityLevel: profile?.default_transport === '도보' ? '높음' : '보통',
        indoorOutdoor: '균형',
      };
      const outfits = await fetchOutfitsWithRelations(user.id);
      const past = outfits.filter((o) => o.worn_on !== today);

      const scored = past.map((o) => ({ o, ...scoreRecommendation(o, vec) }));
      scored.sort((a, b) => b.score - a.score);

      const picks: typeof scored = [];
      let warnings = 0;
      for (const s of scored) {
        if (picks.length >= 3) break;
        if (s.warning && warnings >= 1) continue;
        picks.push(s);
        if (s.warning) warnings++;
      }
      if (picks.length < 3) {
        for (const s of scored) {
          if (picks.length >= 3) break;
          if (picks.some((p) => p.o.id === s.o.id)) continue;
          picks.push(s);
        }
      }

      setReco(
        picks.slice(0, 3).map((s) => ({
          id: s.o.id,
          summary: [s.o.top_category, s.o.bottom_category, s.o.outer_category]
            .filter(Boolean)
            .join(' · '),
          reason: s.reason,
          warning: s.warning,
        }))
      );

    } catch (e) {
      setError(e instanceof Error ? e.message : '날씨를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, profile, quickTags]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
  }, [load]);

  const toggleTag = useCallback((t: string) => {
    setQuickTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }, []);

  const applyTags = useCallback(() => {
    setLoading(true);
    void load();
  }, [load]);

  const emptyReco = useMemo(() => reco.length === 0 && !loading, [reco.length, loading]);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {loading && !weatherLine ? (
        <ActivityIndicator style={{ marginTop: 24 }} color="#0d9488" />
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>오늘 날씨</Text>
        <Text style={styles.cardBody}>{weatherLine || '—'}</Text>
        <Text style={styles.caution}>주의: {caution}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>오늘 상황 (추천 반영)</Text>
        <View style={styles.wrap}>
          {SITUATION_TAGS.slice(0, 8).map((t) => (
            <Pressable
              key={t}
              style={[styles.chip, quickTags.includes(t) && styles.chipOn]}
              onPress={() => toggleTag(t)}
            >
              <Text style={[styles.chipText, quickTags.includes(t) && styles.chipTextOn]}>{t}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable style={styles.secondaryBtn} onPress={applyTags}>
          <Text style={styles.secondaryBtnText}>상황 적용 후 새로고침</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>오늘 추천 착장</Text>
        {emptyReco ? (
          <Text style={styles.muted}>기록을 쌓으면 비슷한 날 기준으로 추천이 나타나요.</Text>
        ) : (
          reco.map((r) => (
            <Pressable
              key={r.id}
              style={styles.recoRow}
              onPress={() => router.push(`/outfit/${r.id}`)}
            >
              {r.warning ? (
                <View style={styles.warnBadge}>
                  <Text style={styles.warnBadgeText}>주의</Text>
                </View>
              ) : null}
              <Text style={styles.recoSummary}>{r.summary || '카테고리 미입력'}</Text>
              <Text style={styles.recoReason}>{r.reason}</Text>
            </Pressable>
          ))
        )}
      </View>

      <Pressable style={styles.primaryBtn} onPress={() => router.push('/outfit/new')}>
        <Text style={styles.primaryBtnText}>오늘 착장 기록</Text>
      </Pressable>

      <Pressable style={styles.outlineBtn} onPress={() => router.push('/similar')}>
        <Text style={styles.outlineBtnText}>비슷한 날 보기</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f5' },
  card: {
    margin: 16,
    marginBottom: 0,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8, color: '#111' },
  cardBody: { fontSize: 15, lineHeight: 22, color: '#333' },
  caution: { marginTop: 10, fontSize: 13, color: '#b45309' },
  error: { margin: 16, color: '#b91c1c' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#e4e4e7',
  },
  chipOn: { backgroundColor: '#99f6e4' },
  chipText: { fontSize: 13, color: '#444' },
  chipTextOn: { color: '#0f766e', fontWeight: '600' },
  secondaryBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  secondaryBtnText: { color: '#0d9488', fontWeight: '600' },
  recoRow: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingVertical: 12,
  },
  recoSummary: { fontSize: 16, fontWeight: '600', color: '#222' },
  recoReason: { fontSize: 13, color: '#666', marginTop: 4 },
  warnBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  warnBadgeText: { color: '#92400e', fontSize: 11, fontWeight: '700' },
  muted: { color: '#71717a', fontSize: 14, lineHeight: 20 },
  primaryBtn: {
    margin: 16,
    marginTop: 8,
    backgroundColor: '#0d9488',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  outlineBtn: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0d9488',
  },
  outlineBtnText: { color: '#0d9488', fontWeight: '600', fontSize: 16 },
});
