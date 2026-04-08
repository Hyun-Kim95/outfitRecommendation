import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { effectiveOutfitSatisfaction } from '@/lib/feedbackSatisfaction';
import { fetchOutfitsWithRelations } from '@/lib/queries';
import type { ThemeColors } from '@/lib/theme-colors';
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

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
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
    muted: { color: c.mutedForeground, marginTop: 4, fontSize: 13 },
    empty: { textAlign: 'center', color: c.mutedForeground, marginTop: 32, paddingHorizontal: 24 },
    headerStar: { fontSize: 18, color: c.star, marginBottom: 8 },
  });
}

export default function FavoritesScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [items, setItems] = useState<Awaited<ReturnType<typeof fetchOutfitsWithRelations>>>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const sb = getSupabase();
    if (!sb) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: favs, error } = await sb
      .from('favorite_outfits')
      .select('outfit_log_id')
      .eq('user_id', user.id);
    if (error || !favs?.length) {
      setItems([]);
      setLoading(false);
      return;
    }
    const ids = favs.map((f) => f.outfit_log_id);
    const all = await fetchOutfitsWithRelations(user.id);
    const setIds = new Set(ids);
    setItems(all.filter((o) => setIds.has(o.id)));
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

  return (
    <View style={styles.container}>
      <Text style={[styles.headerStar, { paddingHorizontal: 16, paddingTop: 12 }]}>★ 즐겨찾기한 착장</Text>
      {loading ? <ActivityIndicator style={{ marginTop: 24 }} color={colors.activityIndicator} /> : null}
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.empty}>즐겨찾기한 착장이 없습니다. 착장 상세 화면 오른쪽 위 별을 눌러 추가해 보세요.</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <FavoriteRow item={item} styles={styles} signUrl={signUrl} />
        )}
      />
    </View>
  );
}

function FavoriteRow({
  item,
  styles,
  signUrl,
}: {
  item: Awaited<ReturnType<typeof fetchOutfitsWithRelations>>[number];
  styles: ReturnType<typeof createStyles>;
  signUrl: (p: string | null) => Promise<string | null>;
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
    <Pressable style={styles.card} onPress={() => router.push(`/outfit/${item.id}`)}>
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
