import { useAuth } from '@/contexts/AuthContext';
import { dateInSeoul } from '@/lib/dates';
import { fetchOutfitsWithRelations } from '@/lib/queries';
import { sortOutfits, type SimilarSort, type TodayVector } from '@/lib/similarDays';
import { fetchOpenMeteoSnapshot } from '@/lib/weather';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function SimilarDaysScreen() {
  const { user, profile } = useAuth();
  const [sort, setSort] = useState<SimilarSort>('similarity');
  const [loading, setLoading] = useState(true);
  const [vec, setVec] = useState<TodayVector | null>(null);
  const [rows, setRows] = useState<ReturnType<typeof sortOutfits>>([]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let lat = profile?.default_lat ?? 37.5665;
      let lng = profile?.default_lng ?? 126.978;

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({});
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      }

      const snap = await fetchOpenMeteoSnapshot(lat, lng);
      const today = dateInSeoul();
      const v: TodayVector = {
        temperature_current: snap.temperature_current,
        temperature_feels_like: snap.temperature_feels_like,
        humidity: snap.humidity,
        wind_speed: snap.wind_speed,
        precipMatch: snap.precipitation_probability > 30,
        situationTags: [],
        activityLevel: '보통',
        indoorOutdoor: '균형',
      };
      setVec(v);

      const outfits = await fetchOutfitsWithRelations(user.id);
      const past = outfits.filter((o) => o.worn_on !== today);
      const sorted = sortOutfits(past, v, sort);
      setRows(sorted);
    } catch (e) {
      console.warn(e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [user, profile, sort]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.sub}>
        오늘(서울 기준일)과 비슷한 날씨·상황의 과거 착장입니다. 정렬을 바꿔 다시 불러옵니다.
      </Text>

      {vec ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>오늘 요약</Text>
          <Text>
            기온 {Math.round(vec.temperature_current)}° · 체감 {Math.round(vec.temperature_feels_like)}° ·
            습도 {Math.round(vec.humidity)}% · 바람 {vec.wind_speed.toFixed(1)}m/s
          </Text>
        </View>
      ) : null}

      <View style={styles.seg}>
        {(
          [
            ['similarity', '유사도'],
            ['rating', '만족도'],
            ['recent', '최신'],
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

      {loading ? <ActivityIndicator color="#0d9488" style={{ marginTop: 24 }} /> : null}

      {!loading && rows.length === 0 ? (
        <Text style={styles.empty}>비교할 과거 기록이 없습니다. 먼저 며칠 기록해 보세요.</Text>
      ) : null}

      {rows.slice(0, 20).map(({ item, similarity, score, warning }) => (
        <Pressable key={item.id} style={styles.row} onPress={() => router.push(`/outfit/${item.id}`)}>
          {warning ? <Text style={styles.warn}>저만족 이력</Text> : null}
          <Text style={styles.date}>{item.worn_on}</Text>
          <Text style={styles.sum}>
            {[item.top_category, item.bottom_category, item.outer_category].filter(Boolean).join(' · ')}
          </Text>
          <Text style={styles.meta}>
            유사 {(similarity * 100).toFixed(0)}% · 추천점수 {score.toFixed(2)} · 만족도{' '}
            {item.rating_logs?.overall_rating ?? '—'}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 40 },
  sub: { color: '#52525b', marginBottom: 12, lineHeight: 20 },
  card: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  cardTitle: { fontWeight: '700', marginBottom: 6 },
  seg: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  segBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#e4e4e7',
  },
  segBtnOn: { backgroundColor: '#99f6e4' },
  segTxt: { fontSize: 13, color: '#444' },
  segTxtOn: { color: '#0f766e', fontWeight: '700' },
  empty: { textAlign: 'center', color: '#71717a', marginTop: 24 },
  row: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  warn: { color: '#b45309', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  date: { fontWeight: '700' },
  sum: { marginTop: 4, color: '#333' },
  meta: { marginTop: 6, fontSize: 12, color: '#71717a' },
});
