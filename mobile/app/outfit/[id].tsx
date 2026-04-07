import { useAuth } from '@/contexts/AuthContext';
import { IMPROVEMENT_TAGS } from '@/lib/options';
import { getSupabase } from '@/lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function OutfitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<{
    worn_on: string;
    top_category: string | null;
    bottom_category: string | null;
    outer_category: string | null;
    shoes_category: string | null;
    memo: string | null;
    photo_path: string | null;
  } | null>(null);
  const [fav, setFav] = useState(false);
  const [uri, setUri] = useState<string | null>(null);
  const [ratings, setRatings] = useState({
    overall: 3,
    temperature: 3,
    mobility: 3,
    context: 3,
    style: 3,
    wearAgain: true,
    improvements: [] as string[],
  });

  const load = useCallback(async () => {
    if (!user || !id) return;
    const sb = getSupabase();
    if (!sb) return;
    setLoading(true);
    const { data, error } = await sb.from('outfit_logs').select('*').eq('id', id).single();
    if (error || !data) {
      setRow(null);
      setLoading(false);
      return;
    }
    if (data.user_id !== user.id) {
      setRow(null);
      setLoading(false);
      return;
    }
    setRow(data);
    const { data: favRow } = await sb
      .from('favorite_outfits')
      .select('outfit_log_id')
      .eq('user_id', user.id)
      .eq('outfit_log_id', id)
      .maybeSingle();
    setFav(!!favRow);

    if (data.photo_path) {
      const { data: signed } = await sb.storage.from('outfit-photos').createSignedUrl(data.photo_path, 3600);
      setUri(signed?.signedUrl ?? null);
    } else setUri(null);

    const { data: r } = await sb.from('rating_logs').select('*').eq('outfit_log_id', id).maybeSingle();
    if (r) {
      setRatings({
        overall: r.overall_rating ?? 3,
        temperature: r.temperature_rating ?? 3,
        mobility: r.mobility_rating ?? 3,
        context: r.context_fit_rating ?? 3,
        style: r.style_rating ?? 3,
        wearAgain: r.would_wear_again !== false,
        improvements: Array.isArray(r.improvement_tags) ? (r.improvement_tags as string[]) : [],
      });
    }

    setLoading(false);
  }, [user, id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function toggleFav() {
    if (!user || !id) return;
    const sb = getSupabase();
    if (!sb) return;
    if (fav) {
      await sb.from('favorite_outfits').delete().eq('user_id', user.id).eq('outfit_log_id', id);
      setFav(false);
    } else {
      await sb.from('favorite_outfits').insert({ user_id: user.id, outfit_log_id: id });
      setFav(true);
    }
  }

  async function saveRating() {
    if (!user || !id) return;
    const sb = getSupabase();
    if (!sb) return;
    const { error } = await sb.from('rating_logs').upsert(
      {
        outfit_log_id: id,
        user_id: user.id,
        overall_rating: ratings.overall,
        temperature_rating: ratings.temperature,
        mobility_rating: ratings.mobility,
        context_fit_rating: ratings.context,
        style_rating: ratings.style,
        would_wear_again: ratings.wearAgain,
        improvement_tags: ratings.improvements,
      },
      { onConflict: 'outfit_log_id' }
    );
    if (error) Alert.alert('오류', error.message);
    else Alert.alert('저장됨', '만족도가 반영되었습니다.');
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#0d9488" />
      </View>
    );
  }

  if (!row) {
    return (
      <View style={styles.center}>
        <Text>찾을 수 없습니다.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      {uri ? <Image source={{ uri }} style={styles.photo} /> : <View style={[styles.photo, styles.ph]} />}
      <Text style={styles.date}>{row.worn_on}</Text>
      <Text style={styles.line}>
        {[row.top_category, row.bottom_category, row.outer_category, row.shoes_category]
          .filter(Boolean)
          .join(' · ')}
      </Text>
      {row.memo ? <Text style={styles.memo}>{row.memo}</Text> : null}

      <Pressable style={styles.outline} onPress={() => router.push(`/feeling/${id}`)}>
        <Text style={styles.outlineTxt}>감상 기록 (출발/중간/귀가)</Text>
      </Pressable>

      <Pressable style={styles.outline} onPress={toggleFav}>
        <Text style={styles.outlineTxt}>{fav ? '즐겨찾기 해제' : '즐겨찾기'}</Text>
      </Pressable>

      <Text style={styles.section}>만족도 (1~5)</Text>
      <RatingRow label="전체" v={ratings.overall} set={(n) => setRatings((r) => ({ ...r, overall: n }))} />
      <RatingRow
        label="온도"
        v={ratings.temperature}
        set={(n) => setRatings((r) => ({ ...r, temperature: n }))}
      />
      <RatingRow
        label="활동"
        v={ratings.mobility}
        set={(n) => setRatings((r) => ({ ...r, mobility: n }))}
      />
      <RatingRow label="상황" v={ratings.context} set={(n) => setRatings((r) => ({ ...r, context: n }))} />
      <RatingRow label="스타일" v={ratings.style} set={(n) => setRatings((r) => ({ ...r, style: n }))} />

      <Pressable
        style={styles.rowBtn}
        onPress={() => setRatings((r) => ({ ...r, wearAgain: !r.wearAgain }))}
      >
        <Text>다시 입을 의향: {ratings.wearAgain ? '예' : '아니오'}</Text>
      </Pressable>

      <Text style={styles.section}>개선점</Text>
      <View style={styles.wrap}>
        {IMPROVEMENT_TAGS.map((t) => (
          <Pressable
            key={t}
            style={[styles.chip, ratings.improvements.includes(t) && styles.chipOn]}
            onPress={() =>
              setRatings((r) => ({
                ...r,
                improvements: r.improvements.includes(t)
                  ? r.improvements.filter((x) => x !== t)
                  : [...r.improvements, t],
              }))
            }
          >
            <Text style={styles.chipTxt}>{t}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.save} onPress={saveRating}>
        <Text style={styles.saveTxt}>만족도 저장</Text>
      </Pressable>
    </ScrollView>
  );
}

function RatingRow({
  label,
  v,
  set,
}: {
  label: string;
  v: number;
  set: (n: number) => void;
}) {
  return (
    <View style={styles.rRow}>
      <Text style={styles.rLabel}>{label}</Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => set(n)} style={styles.starHit}>
            <Text style={{ fontSize: 22, color: n <= v ? '#ca8a04' : '#d4d4d8' }}>★</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, paddingBottom: 40 },
  photo: { width: '100%', height: 220, borderRadius: 12, marginBottom: 12 },
  ph: { backgroundColor: '#e4e4e7' },
  date: { fontSize: 18, fontWeight: '700' },
  line: { marginTop: 8, fontSize: 16, color: '#333' },
  memo: { marginTop: 8, color: '#666' },
  outline: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#0d9488',
    alignItems: 'center',
  },
  outlineTxt: { color: '#0d9488', fontWeight: '600' },
  section: { marginTop: 24, fontWeight: '700', fontSize: 16 },
  rRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, justifyContent: 'space-between' },
  rLabel: { width: 56, color: '#444' },
  stars: { flexDirection: 'row' },
  starHit: { paddingHorizontal: 4 },
  rowBtn: { marginTop: 12, padding: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { padding: 8, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#e4e4e7' },
  chipOn: { backgroundColor: '#fef3c7' },
  chipTxt: { fontSize: 13 },
  save: {
    marginTop: 24,
    backgroundColor: '#0d9488',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveTxt: { color: '#fff', fontWeight: '700' },
});
