import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { effectiveOutfitSatisfaction } from '@/lib/feedbackSatisfaction';
import type { ThemeColors } from '@/lib/theme-colors';
import type { Database } from '@/lib/database.types';
import { getSupabase } from '@/lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
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

type FeedbackRow = Database['public']['Tables']['feedback_logs']['Row'];

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.background },
    scroll: { padding: 16, paddingBottom: 40, backgroundColor: c.background },
    photo: { width: '100%', height: 220, borderRadius: 12, marginBottom: 12 },
    ph: { backgroundColor: c.muted },
    date: { fontSize: 18, fontWeight: '700', color: c.foreground },
    line: { marginTop: 8, fontSize: 16, color: c.foreground },
    memo: { marginTop: 8, color: c.mutedForeground },
    outline: {
      marginTop: 12,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.primary,
      alignItems: 'center',
    },
    outlineDanger: {
      marginTop: 12,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.destructive,
      alignItems: 'center',
    },
    outlineTxt: { color: c.primary, fontWeight: '600' },
    outlineTxtDanger: { color: c.destructive, fontWeight: '600' },
    section: { marginTop: 24, fontWeight: '700', fontSize: 16, color: c.foreground },
    satLine: { marginTop: 8, fontSize: 16, color: c.foreground },
    stars: { color: c.star, fontSize: 18 },
    memoBlock: {
      marginTop: 10,
      padding: 12,
      borderRadius: 10,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    memoTime: { fontSize: 13, color: c.mutedForeground, marginBottom: 4 },
    memoText: { fontSize: 15, color: c.foreground },
    missingText: { color: c.mutedForeground },
    headerStarBtn: { paddingHorizontal: 12, paddingVertical: 8 },
    headerStar: { fontSize: 26 },
  });
}

export default function OutfitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<{
    user_id: string;
    worn_on: string;
    top_category: string | null;
    bottom_category: string | null;
    outer_category: string | null;
    shoes_category: string | null;
    accessory_tags: unknown;
    thickness_level: string | null;
    memo: string | null;
    photo_path: string | null;
  } | null>(null);
  const [fav, setFav] = useState(false);
  const [uri, setUri] = useState<string | null>(null);
  const [feedbacks, setFeedbacks] = useState<FeedbackRow[]>([]);
  const [legacyOverall, setLegacyOverall] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

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

    const { data: fbRows } = await sb
      .from('feedback_logs')
      .select('*')
      .eq('outfit_log_id', id)
      .order('created_at', { ascending: false });
    setFeedbacks((fbRows as FeedbackRow[]) ?? []);

    const { data: r } = await sb.from('rating_logs').select('overall_rating').eq('outfit_log_id', id).maybeSingle();
    setLegacyOverall(r?.overall_rating ?? null);

    setLoading(false);
  }, [user, id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const toggleFav = useCallback(async () => {
    if (!user || !id) return;
    const sb = getSupabase();
    if (!sb) return;
    try {
      if (fav) {
        const { error } = await sb
          .from('favorite_outfits')
          .delete()
          .eq('user_id', user.id)
          .eq('outfit_log_id', id);
        if (error) throw error;
        setFav(false);
      } else {
        const { error } = await sb.from('favorite_outfits').insert({ user_id: user.id, outfit_log_id: id });
        if (error) throw error;
        setFav(true);
      }
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '즐겨찾기 처리 실패');
    }
  }, [fav, user, id]);

  function confirmDelete() {
    Alert.alert('착장 삭제', '이 착장 기록과 연결된 감상·만족도 데이터가 함께 삭제됩니다. 계속할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => void deleteOutfit() },
    ]);
  }

  async function deleteOutfit() {
    if (!user || !id || !row) return;
    const sb = getSupabase();
    if (!sb) return;
    setDeleting(true);
    try {
      if (row.photo_path) {
        const { error: stErr } = await sb.storage.from('outfit-photos').remove([row.photo_path]);
        if (stErr) console.warn('storage remove', stErr.message);
      }
      const { error } = await sb.from('outfit_logs').delete().eq('id', id).eq('user_id', user.id);
      if (error) throw error;
      Alert.alert('삭제됨', '착장 기록이 삭제되었습니다.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '삭제 실패');
    } finally {
      setDeleting(false);
    }
  }

  const aggregateSat = effectiveOutfitSatisfaction(feedbacks, legacyOverall);
  const memoEntries = feedbacks.filter((f) => f.note && f.note.trim().length > 0);

  return (
    <>
      <Stack.Screen
        options={{
          headerRight:
            loading || !row
              ? undefined
              : () => (
                  <Pressable
                    onPress={() => void toggleFav()}
                    style={styles.headerStarBtn}
                    accessibilityRole="button"
                    accessibilityLabel={fav ? '즐겨찾기 해제' : '즐겨찾기'}
                    hitSlop={10}
                  >
                    <Text style={[styles.headerStar, { color: fav ? colors.star : colors.mutedForeground }]}>
                      {fav ? '★' : '☆'}
                    </Text>
                  </Pressable>
                ),
        }}
      />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.activityIndicator} />
        </View>
      ) : !row ? (
        <View style={styles.center}>
          <Text style={styles.missingText}>찾을 수 없습니다.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {uri ? <Image source={{ uri }} style={styles.photo} /> : <View style={[styles.photo, styles.ph]} />}
          <Text style={styles.date}>{row.worn_on}</Text>
          <Text style={styles.line}>
            {[row.top_category, row.bottom_category, row.outer_category, row.shoes_category]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          {row.thickness_level ? <Text style={styles.memo}>두께감: {row.thickness_level}</Text> : null}
          {Array.isArray(row.accessory_tags) && row.accessory_tags.length > 0 ? (
            <Text style={styles.memo}>액세서리: {(row.accessory_tags as string[]).join(' · ')}</Text>
          ) : null}
          {row.memo ? <Text style={styles.memo}>{row.memo}</Text> : null}

          <Text style={styles.section}>종합 만족도 (감상 기준)</Text>
          {aggregateSat != null ? (
            <>
              <Text style={styles.satLine}>
                평균 {aggregateSat % 1 === 0 ? String(aggregateSat) : aggregateSat.toFixed(1)} / 5
              </Text>
              {legacyOverall != null && !feedbacks.some((f) => f.overall_satisfaction != null) ? (
                <Text style={styles.memo}>레거시 단일 평가가 반영되었습니다.</Text>
              ) : null}
              <Text style={styles.stars}>
                {'★'.repeat(Math.min(5, Math.round(aggregateSat)))}
                {'☆'.repeat(Math.max(0, 5 - Math.round(aggregateSat)))}
              </Text>
            </>
          ) : (
            <Text style={styles.memo}>감상 기록에서 만족도를 남기면 여기에 평균이 표시됩니다.</Text>
          )}

          {memoEntries.length > 0 ? (
            <>
              <Text style={styles.section}>감상 메모</Text>
              {memoEntries.map((f) => (
                <View key={f.id} style={styles.memoBlock}>
                  <Text style={styles.memoTime}>
                    {f.time_period ? `${f.time_period} · ` : ''}
                    {new Date(f.created_at).toLocaleString('ko-KR', {
                      month: 'numeric',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                  <Text style={styles.memoText}>{f.note}</Text>
                </View>
              ))}
            </>
          ) : null}

          <Pressable style={styles.outline} onPress={() => router.push(`/feeling/${id}`)}>
            <Text style={styles.outlineTxt}>감상 기록 (이동·장소·체감·만족도)</Text>
          </Pressable>

          <Pressable style={styles.outline} onPress={() => router.push(`/outfit/edit/${id}`)}>
            <Text style={styles.outlineTxt}>착장 수정</Text>
          </Pressable>

          <Pressable
            style={[styles.outlineDanger, deleting && { opacity: 0.6 }]}
            onPress={confirmDelete}
            disabled={deleting}
          >
            <Text style={styles.outlineTxtDanger}>{deleting ? '삭제 중…' : '착장 삭제'}</Text>
          </Pressable>
        </ScrollView>
      )}
    </>
  );
}
