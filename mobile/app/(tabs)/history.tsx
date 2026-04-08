import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { effectiveOutfitSatisfaction } from '@/lib/feedbackSatisfaction';
import type { ThemeColors } from '@/lib/theme-colors';
import { fetchOutfitsWithRelations } from '@/lib/queries';
import { getSupabase } from '@/lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type FavoriteFilter = 'all' | 'only';
type SatisfactionFilter = 'all' | '4up' | '3up';
type DateFilter = 'all' | '7d' | '30d';

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
    chip: {
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: 16,
      backgroundColor: c.chipBg,
    },
    chipOn: { backgroundColor: c.chipOnBg },
    chipText: { color: c.chipText, fontSize: 13 },
    chipTextOn: { color: c.chipTextOn, fontWeight: '600' },
    list: { padding: 16, paddingBottom: 32 },
    card: {
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: c.border,
    },
    row: { flexDirection: 'row', gap: 12 },
    thumb: { width: 64, height: 64, borderRadius: 8 },
    thumbPlaceholder: { backgroundColor: c.muted },
    meta: { flex: 1, justifyContent: 'center' },
    date: { fontWeight: '700', color: c.foreground },
    summary: { color: c.mutedForeground, marginTop: 4 },
    stars: { color: c.star, marginTop: 4, fontSize: 13 },
    favMark: { position: 'absolute', top: 10, right: 12, fontSize: 20, color: c.star },
    muted: { color: c.mutedForeground, marginTop: 4, fontSize: 13 },
    empty: { textAlign: 'center', color: c.mutedForeground, marginTop: 32, paddingHorizontal: 24 },
  });
}

export default function HistoryScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [items, setItems] = useState<Awaited<ReturnType<typeof fetchOutfitsWithRelations>>>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favoriteFilter, setFavoriteFilter] = useState<FavoriteFilter>('all');
  const [satisfactionFilter, setSatisfactionFilter] = useState<SatisfactionFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const rows = await fetchOutfitsWithRelations(user.id);
    const sb = getSupabase();
    let nextFav = new Set<string>();
    if (sb) {
      const { data: favs } = await sb.from('favorite_outfits').select('outfit_log_id').eq('user_id', user.id);
      nextFav = new Set((favs ?? []).map((f) => f.outfit_log_id));
    }
    setItems(rows);
    setFavoriteIds(nextFav);
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const signUrl = useCallback(async (path: string | null) => {
    if (!path) return null;
    const sb = getSupabase();
    if (!sb) return null;
    const { data, error } = await sb.storage.from('outfit-photos').createSignedUrl(path, 3600);
    if (error) return null;
    return data.signedUrl;
  }, []);

  const filteredItems = useMemo(() => {
    const now = new Date();
    return items.filter((item) => {
      if (favoriteFilter === 'only' && !favoriteIds.has(item.id)) return false;

      const sat = effectiveOutfitSatisfaction(item.feedback_logs, item.rating_logs?.overall_rating ?? null);
      if (satisfactionFilter === '4up' && (sat == null || sat < 4)) return false;
      if (satisfactionFilter === '3up' && (sat == null || sat < 3)) return false;

      if (dateFilter !== 'all') {
        const d = new Date(item.worn_on);
        if (Number.isNaN(d.getTime())) return false;
        const diffDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
        if (dateFilter === '7d' && diffDays > 7) return false;
        if (dateFilter === '30d' && diffDays > 30) return false;
      }
      return true;
    });
  }, [items, favoriteIds, favoriteFilter, satisfactionFilter, dateFilter]);

  const favoriteOptions: { key: FavoriteFilter; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'only', label: '즐겨찾기' },
  ];
  const satisfactionOptions: { key: SatisfactionFilter; label: string }[] = [
    { key: 'all', label: '만족도 전체' },
    { key: '4up', label: '만족도 4.0+' },
    { key: '3up', label: '만족도 3.0+' },
  ];
  const dateOptions: { key: DateFilter; label: string }[] = [
    { key: 'all', label: '날짜 전체' },
    { key: '7d', label: '최근 7일' },
    { key: '30d', label: '최근 30일' },
  ];

  return (
    <View style={styles.container}>
      {loading ? <ActivityIndicator style={{ marginTop: 24 }} color={colors.activityIndicator} /> : null}
      <View style={styles.filterRow}>
        {favoriteOptions.map((f) => (
          <Pressable
            key={f.key}
            style={[styles.chip, favoriteFilter === f.key && styles.chipOn]}
            onPress={() => setFavoriteFilter(f.key)}
          >
            <Text style={[styles.chipText, favoriteFilter === f.key && styles.chipTextOn]}>{f.label}</Text>
          </Pressable>
        ))}
        {satisfactionOptions.map((f) => (
          <Pressable
            key={f.key}
            style={[styles.chip, satisfactionFilter === f.key && styles.chipOn]}
            onPress={() => setSatisfactionFilter(f.key)}
          >
            <Text style={[styles.chipText, satisfactionFilter === f.key && styles.chipTextOn]}>{f.label}</Text>
          </Pressable>
        ))}
        {dateOptions.map((f) => (
          <Pressable
            key={f.key}
            style={[styles.chip, dateFilter === f.key && styles.chipOn]}
            onPress={() => setDateFilter(f.key)}
          >
            <Text style={[styles.chipText, dateFilter === f.key && styles.chipTextOn]}>{f.label}</Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={filteredItems}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.empty}>필터 조건에 맞는 기록이 없어요. 홈에서 오늘 착장을 남겨보세요.</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <HistoryRow
            item={item}
            styles={styles}
            favorite={favoriteIds.has(item.id)}
            onPress={() => router.push(`/outfit/${item.id}`)}
            signUrl={signUrl}
          />
        )}
      />
    </View>
  );
}

function HistoryRow({
  item,
  favorite,
  onPress,
  signUrl,
  styles,
}: {
  item: Awaited<ReturnType<typeof fetchOutfitsWithRelations>>[number];
  favorite: boolean;
  onPress: () => void;
  signUrl: (p: string | null) => Promise<string | null>;
  styles: ReturnType<typeof createStyles>;
}) {
  const [uri, setUri] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void (async () => {
      const u = await signUrl(item.photo_path);
      if (alive) setUri(u);
    })();
    return () => {
      alive = false;
    };
  }, [item.photo_path, signUrl]);

  const sat = effectiveOutfitSatisfaction(item.feedback_logs, item.rating_logs?.overall_rating ?? null);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      {favorite ? <Text style={styles.favMark}>★</Text> : null}
      <View style={styles.row}>
        {uri ? (
          <Image source={{ uri }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]} />
        )}
        <View style={styles.meta}>
          <Text style={styles.date}>{item.worn_on}</Text>
          <Text style={styles.summary}>
            {[item.top_category, item.bottom_category, item.outer_category].filter(Boolean).join(' · ') ||
              '카테고리 미입력'}
          </Text>
          {sat != null ? (
            <Text style={styles.stars}>
              만족 평균 {sat % 1 === 0 ? String(sat) : sat.toFixed(1)}/5 ·{'★'.repeat(Math.min(5, Math.round(sat)))}
              {'☆'.repeat(Math.max(0, 5 - Math.round(sat)))}
            </Text>
          ) : (
            <Text style={styles.muted}>만족도 미입력</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}
