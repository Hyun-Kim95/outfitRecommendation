import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { HomeWeatherPreview } from '@/lib/domain/homeWeather';
import { dateInSeoul } from '@/lib/dates';
import { computeInsightSummary } from '@/lib/insightsStats';
import { fetchOutfitsWithRelations } from '@/lib/queries';
import { SITUATION_TAGS } from '@/lib/options';
import { upsertTodayRecommendationLog } from '@/lib/recommendationSession';
import { scoreRecommendation, type TodayVector } from '@/lib/similarDays';
import {
  activityLevelFromTransports,
  getActivityRegionsFromProfile,
  getDefaultTransportsFromProfile,
} from '@/lib/profileCompat';
import { fetchOpenMeteoSnapshot, formatTempRange } from '@/lib/weather';
import { getSupabase } from '@/lib/supabase';
import { useTodayRecommendStore } from '@/stores/todayRecommendStore';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import type { ThemeColors } from '@/lib/theme-colors';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type RecoItem = { id: string; summary: string; reason: string; warning: boolean };

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    linkHint: {
      marginHorizontal: 16,
      marginTop: 8,
      fontSize: 13,
      color: c.mutedForeground,
      lineHeight: 18,
    },
    weatherHero: {
      margin: 16,
      marginBottom: 0,
      padding: 20,
      backgroundColor: c.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
    },
    weatherRegion: { fontSize: 14, color: c.mutedForeground, marginBottom: 4 },
    weatherBigRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
    weatherTemp: { fontSize: 44, fontWeight: '800', color: c.foreground },
    weatherUnit: { fontSize: 18, fontWeight: '600', color: c.mutedForeground },
    weatherCond: { fontSize: 16, color: c.foreground, marginTop: 4 },
    weatherGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 16,
      gap: 12,
    },
    weatherCell: {
      minWidth: '45%',
      flexGrow: 1,
      padding: 10,
      borderRadius: 10,
      backgroundColor: c.muted,
    },
    weatherCellLabel: { fontSize: 11, color: c.mutedForeground, marginBottom: 2 },
    weatherCellValue: { fontSize: 15, fontWeight: '600', color: c.foreground },
    caution: { marginTop: 14, fontSize: 13, color: c.warning },
    card: {
      margin: 16,
      marginBottom: 0,
      padding: 16,
      backgroundColor: c.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
    },
    cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10, color: c.cardForeground },
    cardBody: { fontSize: 15, lineHeight: 22, color: c.foreground },
    error: { margin: 16, color: c.destructive },
    wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 16,
      backgroundColor: c.chipBg,
    },
    chipOn: { backgroundColor: c.chipOnBg },
    chipText: { fontSize: 13, color: c.chipText },
    chipTextOn: { color: c.chipTextOn, fontWeight: '600' },
    secondaryBtn: {
      marginTop: 12,
      alignSelf: 'flex-start',
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    secondaryBtnText: { color: c.primary, fontWeight: '600' },
    recoRow: {
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingVertical: 12,
    },
    recoSummary: { fontSize: 16, fontWeight: '600', color: c.foreground },
    recoReason: { fontSize: 13, color: c.mutedForeground, marginTop: 4 },
    warnBadge: {
      alignSelf: 'flex-start',
      backgroundColor: c.warningBg,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      marginBottom: 4,
    },
    warnBadgeText: { color: c.warningText, fontSize: 11, fontWeight: '700' },
    muted: { color: c.mutedForeground, fontSize: 14, lineHeight: 20 },
    statLine: { fontSize: 14, color: c.foreground, marginBottom: 6 },
    primaryBtn: {
      margin: 16,
      marginTop: 8,
      backgroundColor: c.primary,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    primaryBtnText: { color: c.primaryForeground, fontWeight: '700', fontSize: 16 },
    outlineBtn: {
      margin: 16,
      marginTop: 0,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.primary,
    },
    outlineBtnText: { color: c.primary, fontWeight: '600', fontSize: 16 },
  });
}

function WeatherSummaryCard({
  styles,
  w,
}: {
  styles: ReturnType<typeof createStyles>;
  w: HomeWeatherPreview;
}) {
  const caution = useMemo(() => {
    const spread = w.max - w.min;
    const parts: string[] = [];
    if (spread >= 10) parts.push(`일교차 ${Math.round(spread)}° — 겹쳐 입기 좋아요`);
    if (w.windMs >= 6) parts.push('바람이 강해요');
    if (w.rainLikely) parts.push('비 가능성 있음');
    return parts.length ? parts.join(' · ') : '특별한 주의 없음';
  }, [w]);

  return (
    <View style={styles.weatherHero}>
      <Text style={styles.weatherRegion}>오늘 · {w.regionLabel}</Text>
      <View style={styles.weatherBigRow}>
        <Text style={styles.weatherTemp}>{Math.round(w.temp)}</Text>
        <Text style={styles.weatherUnit}>°C</Text>
        <Text style={[styles.weatherCond, { marginLeft: 8 }]}>체감 {Math.round(w.feelsLike)}°</Text>
      </View>
      <Text style={styles.weatherCond}>{w.condition}</Text>
      <View style={styles.weatherGrid}>
        <View style={styles.weatherCell}>
          <Text style={styles.weatherCellLabel}>최저 · 최고</Text>
          <Text style={styles.weatherCellValue}>
            {Math.round(w.min)}° · {Math.round(w.max)}°
          </Text>
        </View>
        <View style={styles.weatherCell}>
          <Text style={styles.weatherCellLabel}>바람</Text>
          <Text style={styles.weatherCellValue}>{w.windMs.toFixed(1)} m/s</Text>
        </View>
        <View style={styles.weatherCell}>
          <Text style={styles.weatherCellLabel}>습도</Text>
          <Text style={styles.weatherCellValue}>{w.humidity}%</Text>
        </View>
        <View style={styles.weatherCell}>
          <Text style={styles.weatherCellLabel}>강수</Text>
          <Text style={styles.weatherCellValue}>{w.rainLikely ? '가능' : '낮음'}</Text>
        </View>
      </View>
      <Text style={styles.caution}>팁: {caution}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const { user, profile } = useAuth();
  const setSession = useTodayRecommendStore((s) => s.setSession);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weatherPreview, setWeatherPreview] = useState<HomeWeatherPreview | null>(null);
  const [weatherLineFallback, setWeatherLineFallback] = useState('');
  const [caution, setCaution] = useState('');
  const [reco, setReco] = useState<RecoItem[]>([]);
  const [quickTags, setQuickTags] = useState<string[]>([]);
  const [insightLine, setInsightLine] = useState<string | null>(null);
  const [recoLinked, setRecoLinked] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setWeatherPreview(null);
      setReco([]);
      setInsightLine(null);
      setRecoLinked(false);
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      setLoading(false);
      return;
    }

    setError(null);
    try {
      const regions = getActivityRegionsFromProfile(profile);
      const today = dateInSeoul();
      const lineParts: string[] = [];
      let maxSpread = 0;
      let strongWind = false;
      let wet = false;
      const snaps: Awaited<ReturnType<typeof fetchOpenMeteoSnapshot>>[] = [];

      for (const r of regions) {
        const snap = await fetchOpenMeteoSnapshot(r.lat, r.lng, r.label);
        snaps.push(snap);
        const spread = snap.temperature_max - snap.temperature_min;
        maxSpread = Math.max(maxSpread, spread);
        if (snap.wind_speed >= 6) strongWind = true;
        if (snap.precipitation_probability > 40) wet = true;

        const { error: wErr } = await sb.from('weather_logs').upsert(
          {
            user_id: user.id,
            snapshot_date: today,
            region_slug: r.slug,
            region_name: r.label,
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
          { onConflict: 'user_id,snapshot_date,region_slug' }
        );

        if (wErr) throw new Error(wErr.message);

        lineParts.push(
          `${r.label} · ${Math.round(snap.temperature_current)}° (체감 ${Math.round(snap.temperature_feels_like)}°) · ${snap.weather_condition} · ${formatTempRange(snap.temperature_min, snap.temperature_max)}`
        );
      }

      setWeatherLineFallback(lineParts.join('\n'));

      let c = '';
      if (maxSpread >= 10) c += `일교차 ${Math.round(maxSpread)}° — 레이어드 추천. `;
      if (strongWind) c += '선택한 지역 중 바람이 강한 곳이 있어요. ';
      if (wet) c += '강수 가능성 있음 — 우산·방수 확인. ';
      setCaution(c.trim() || '특별한 주의사항 없음');

      const refSnap = snaps[0];
      const primarySlug = regions[0]?.slug ?? 'seoul';
      const weatherUi: HomeWeatherPreview = {
        regionLabel: regions[0]?.label ?? '—',
        temp: refSnap.temperature_current,
        feelsLike: refSnap.temperature_feels_like,
        min: refSnap.temperature_min,
        max: refSnap.temperature_max,
        windMs: refSnap.wind_speed,
        humidity: refSnap.humidity,
        rainLikely: refSnap.precipitation_probability > 40,
        condition: refSnap.weather_condition,
      };
      setWeatherPreview(weatherUi);

      const { data: wlPrimary } = await sb
        .from('weather_logs')
        .select('id')
        .eq('user_id', user.id)
        .eq('snapshot_date', today)
        .eq('region_slug', primarySlug)
        .maybeSingle();

      const transports = getDefaultTransportsFromProfile(profile);
      const vec: TodayVector = {
        temperature_current: refSnap.temperature_current,
        temperature_feels_like: refSnap.temperature_feels_like,
        humidity: refSnap.humidity,
        wind_speed: refSnap.wind_speed,
        precipMatch: refSnap.precipitation_probability > 30,
        situationTags: quickTags,
        activityLevel: activityLevelFromTransports(transports),
        indoorOutdoor: '균형',
      };
      const outfits = await fetchOutfitsWithRelations(user.id);
      const ins = computeInsightSummary(outfits);
      setInsightLine(
        `착장 ${ins.outfitCount}건 · 감상 ${ins.feedbackEntryCount}건` +
          (ins.avgSatisfaction != null ? ` · 평균 만족 ${ins.avgSatisfaction}/5` : '')
      );

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

      const recoItems: RecoItem[] = picks.slice(0, 3).map((s) => ({
        id: s.o.id,
        summary: [s.o.top_category, s.o.bottom_category, s.o.outer_category].filter(Boolean).join(' · '),
        reason: s.reason,
        warning: s.warning,
      }));
      setReco(recoItems);

      const recommendedIds = recoItems.map((r) => r.id);
      const recRes = await upsertTodayRecommendationLog({
        userId: user.id,
        logDate: today,
        weatherLogId: wlPrimary?.id ?? null,
        recommendedOutfitLogIds: recommendedIds,
      });
      setRecoLinked(recRes.ok);

      setSession({
        snapshotDate: today,
        primaryWeatherLogId: wlPrimary?.id ?? null,
        primaryRegionSlug: primarySlug,
        weatherUi,
        situationTags: quickTags,
        recommendedOutfitIds: recommendedIds,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : '날씨를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, profile, quickTags, setSession]);

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

  const openReco = useCallback((r: RecoItem) => {
    router.push(`/outfit/${r.id}`);
  }, []);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {loading && !weatherPreview ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={colors.activityIndicator} />
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {weatherPreview ? (
        <WeatherSummaryCard styles={styles} w={weatherPreview} />
      ) : weatherLineFallback ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>오늘 날씨</Text>
          <Text style={styles.cardBody}>{weatherLineFallback}</Text>
          <Text style={styles.caution}>주의: {caution}</Text>
        </View>
      ) : null}

      {user && weatherPreview ? (
        <Text style={styles.linkHint}>
          위 날씨가 DB에 저장되고, 같은 조건으로 과거 착장을 골라 추천합니다.
          {recoLinked ? ' 오늘의 추천 목록도 기록에 남겼어요.' : ''}
        </Text>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>오늘 상황 (추천 반영)</Text>
        <Text style={styles.muted}>3단계 회고·비슷한 날 비교에도 쓰입니다.</Text>
        <View style={[styles.wrap, { marginTop: 10 }]}>
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
          <Text style={styles.muted}>기록을 쌓으면 비슷한 날씨·상황과 만족도를 반영해 추천이 나타나요.</Text>
        ) : (
          reco.map((r) => (
            <Pressable key={r.id} style={styles.recoRow} onPress={() => openReco(r)}>
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

      {insightLine && user ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>기록이 쌓일수록</Text>
          <Text style={styles.statLine}>{insightLine}</Text>
          <Text style={styles.muted}>감상(만족도)이 많을수록 추천이 안정됩니다.</Text>
          <Pressable style={styles.secondaryBtn} onPress={() => router.push('/insights')}>
            <Text style={styles.secondaryBtnText}>통계·분석 보기</Text>
          </Pressable>
        </View>
      ) : null}

      <Pressable style={styles.primaryBtn} onPress={() => router.push('/outfit/new')}>
        <Text style={styles.primaryBtnText}>빠른 착장 기록</Text>
      </Pressable>

      <Pressable style={styles.outlineBtn} onPress={() => router.push('/similar')}>
        <Text style={styles.outlineBtnText}>비슷한 날 보기</Text>
      </Pressable>

      <Pressable style={[styles.outlineBtn, { marginTop: 8 }]} onPress={() => router.push('/favorites')}>
        <Text style={styles.outlineBtnText}>★ 즐겨찾기한 착장</Text>
      </Pressable>
    </ScrollView>
  );
}
