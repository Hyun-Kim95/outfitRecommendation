import { useAuth } from '@/contexts/AuthContext';
import { fetchOutfitsWithRelations } from '@/lib/queries';
import { getSupabase } from '@/lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function HistoryScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<Awaited<ReturnType<typeof fetchOutfitsWithRelations>>>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const rows = await fetchOutfitsWithRelations(user.id);
    setItems(rows);
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
      {loading ? <ActivityIndicator style={{ marginTop: 24 }} color="#0d9488" /> : null}
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading ? <Text style={styles.empty}>아직 기록이 없어요. 홈에서 오늘 착장을 남겨보세요.</Text> : null
        }
        renderItem={({ item }) => (
          <HistoryRow item={item} onPress={() => router.push(`/outfit/${item.id}`)} signUrl={signUrl} />
        )}
      />
    </View>
  );
}

function HistoryRow({
  item,
  onPress,
  signUrl,
}: {
  item: Awaited<ReturnType<typeof fetchOutfitsWithRelations>>[number];
  onPress: () => void;
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

  const stars = item.rating_logs?.overall_rating ?? null;

  return (
    <Pressable style={styles.card} onPress={onPress}>
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
          {stars != null ? (
            <Text style={styles.stars}>만족도 {'★'.repeat(stars)}{'☆'.repeat(5 - stars)}</Text>
          ) : (
            <Text style={styles.muted}>만족도 미입력</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f5' },
  list: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  row: { flexDirection: 'row', gap: 12 },
  thumb: { width: 64, height: 64, borderRadius: 8 },
  thumbPlaceholder: { backgroundColor: '#e4e4e7' },
  meta: { flex: 1, justifyContent: 'center' },
  date: { fontWeight: '700', color: '#111' },
  summary: { color: '#444', marginTop: 4 },
  stars: { color: '#ca8a04', marginTop: 4, fontSize: 13 },
  muted: { color: '#888', marginTop: 4, fontSize: 13 },
  empty: { textAlign: 'center', color: '#71717a', marginTop: 32, paddingHorizontal: 24 },
});
