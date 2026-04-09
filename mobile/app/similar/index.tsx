import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useTheme } from '@/contexts/ThemeContext';
import { dateInSeoul } from '@/lib/dates';
import { effectiveOutfitSatisfaction } from '@/lib/feedbackSatisfaction';
import { optionListLabel } from '@/lib/optionLabels';
import { fetchOutfitsWithRelations } from '@/lib/queries';
import { sortOutfits, type SimilarSort, type TodayVector } from '@/lib/similarDays';
import {
  activityLevelFromTransports,
  getDefaultTransportsFromProfile,
  getPrimaryCoords,
} from '@/lib/profileCompat';
import type { ThemeColors } from '@/lib/theme-colors';
import { fetchOpenMeteoSnapshot } from '@/lib/weather';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    scroll: { padding: 16, paddingBottom: 40, backgroundColor: c.background },
    sub: { color: c.mutedForeground, marginBottom: 12, lineHeight: 20 },
    card: {
      backgroundColor: c.card,
      padding: 14,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: c.border,
    },
    cardTitle: { fontWeight: '700', marginBottom: 6, color: c.foreground },
    cardBody: { color: c.foreground },
    seg: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    segBtn: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: c.chipBg,
    },
    segBtnOn: { backgroundColor: c.chipOnBg },
    segTxt: { fontSize: 13, color: c.chipText },
    segTxtOn: { color: c.chipTextOn, fontWeight: '700' },
    empty: { textAlign: 'center', color: c.mutedForeground, marginTop: 24 },
    row: {
      backgroundColor: c.card,
      padding: 14,
      borderRadius: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: c.border,
    },
    warn: { color: c.warning, fontSize: 12, fontWeight: '600', marginBottom: 4 },
    date: { fontWeight: '700', color: c.foreground },
    sum: { marginTop: 4, color: c.foreground },
    meta: { marginTop: 6, fontSize: 12, color: c.mutedForeground },
  });
}

export default function SimilarDaysScreen() {
  const { user, profile } = useAuth();
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [sort, setSort] = useState<SimilarSort>('similarity');
  const [loading, setLoading] = useState(true);
  const [vec, setVec] = useState<TodayVector | null>(null);
  const [rows, setRows] = useState<ReturnType<typeof sortOutfits>>([]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { lat, lng, label } = getPrimaryCoords(profile);
      const snap = await fetchOpenMeteoSnapshot(lat, lng, label);
      const today = dateInSeoul();
      const v: TodayVector = {
        temperature_current: snap.temperature_current,
        temperature_feels_like: snap.temperature_feels_like,
        humidity: snap.humidity,
        wind_speed: snap.wind_speed,
        precipMatch: snap.precipitation_probability > 30,
        situationTags: [],
        activityLevel: activityLevelFromTransports(getDefaultTransportsFromProfile(profile)),
        indoorOutdoor: '균형',
      };
      setVec(v);

      const outfits = await fetchOutfitsWithRelations(user.id);
      const past = outfits.filter((o) => o.worn_on !== today);
      const sorted = sortOutfits(past, v, sort, locale);
      setRows(sorted);
    } catch (e) {
      console.warn(e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [user, profile, sort, locale]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.sub}>
        {isEn
          ? 'Past outfits with weather/context similar to today. Saved weather snapshots are used for similarity. Change sort to reload.'
          : '오늘과 비슷한 날씨·상황의 과거 착장입니다. 착장 저장 시 남긴 날씨 스냅샷이 있으면 유사도에 반영됩니다. 정렬을 바꿔 다시 불러옵니다.'}
      </Text>

      {vec ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{isEn ? 'Today summary' : '오늘 요약'}</Text>
          <Text style={styles.cardBody}>
            {isEn ? 'Temp' : '기온'} {Math.round(vec.temperature_current)}° · {isEn ? 'Feels like' : '체감'}{' '}
            {Math.round(vec.temperature_feels_like)}° · {isEn ? 'Humidity' : '습도'} {Math.round(vec.humidity)}% ·{' '}
            {isEn ? 'Wind' : '바람'} {vec.wind_speed.toFixed(1)}m/s
          </Text>
        </View>
      ) : null}

      <View style={styles.seg}>
        {(
          [
            ['similarity', isEn ? 'Similarity' : '유사도'],
            ['rating', isEn ? 'Satisfaction' : '만족도'],
            ['recent', isEn ? 'Recent' : '최신'],
          ] as const
        ).map(([k, label]) => (
          <Pressable
            key={k}
            style={[styles.segBtn, sort === k && styles.segBtnOn]}
            onPress={() => setSort(k)}
          >
            <Text style={[styles.segTxt, sort === k && styles.segTxtOn]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? <ActivityIndicator color={colors.activityIndicator} style={{ marginTop: 24 }} /> : null}

      {!loading && rows.length === 0 ? (
        <Text style={styles.empty}>
          {isEn
            ? 'No past records to compare. Add a few outfit logs first.'
            : '비교할 과거 기록이 없습니다. 먼저 며칠 기록해 보세요.'}
        </Text>
      ) : null}

      {rows.slice(0, 20).map(({ item, similarity, score, warning }) => {
        const sat = effectiveOutfitSatisfaction(
          item.feedback_logs,
          item.rating_logs?.overall_rating ?? null
        );
        const satLabel = sat != null ? (sat % 1 === 0 ? String(sat) : sat.toFixed(1)) : '—';
        return (
          <Pressable key={item.id} style={styles.row} onPress={() => router.push(`/outfit/${item.id}`)}>
            {warning ? <Text style={styles.warn}>{isEn ? 'Low-satisfaction history' : '저만족 이력'}</Text> : null}
            <Text style={styles.date}>{item.worn_on}</Text>
            <Text style={styles.sum}>
              {[item.top_category, item.bottom_category, item.outer_category]
                .filter(Boolean)
                .map((x) => optionListLabel(isEn ? 'en' : 'ko', x))
                .join(' · ')}
            </Text>
            <Text style={styles.meta}>
              {isEn ? 'Similarity' : '유사'} {(similarity * 100).toFixed(0)}% ·{' '}
              {isEn ? 'Score' : '추천점수'} {score.toFixed(2)} · {isEn ? 'Satisfaction' : '만족도'} {satLabel}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
