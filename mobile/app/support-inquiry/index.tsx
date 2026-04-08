import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { getSupabase } from '@/lib/supabase';
import type { ThemeColors } from '@/lib/theme-colors';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
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

type TicketRow = {
  id: string;
  subject: string;
  status: string;
  created_at: string;
};

function statusText(status: string): string {
  if (status === 'answered') return '답변 완료';
  return '답변 대기';
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    scrollContent: { padding: 16, paddingBottom: 32 },
    row: {
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: c.border,
    },
    subject: { fontSize: 16, fontWeight: '600', color: c.foreground, marginBottom: 6 },
    meta: { fontSize: 12, color: c.mutedForeground },
    badge: {
      alignSelf: 'flex-start',
      marginTop: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: c.secondary,
    },
    badgeText: { fontSize: 12, fontWeight: '600', color: c.secondaryForeground },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    muted: { color: c.mutedForeground, textAlign: 'center', lineHeight: 22 },
  });
}

export default function SupportInquiryListScreen() {
  const { session } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [rows, setRows] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || !session?.user) {
      setRows([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    setError(null);
    const { data, error: qErr } = await sb
      .from('support_tickets')
      .select('id, subject, status, created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    if (qErr) {
      setError(qErr.message);
      setRows([]);
    } else {
      setRows((data ?? []) as TicketRow[]);
    }
    setLoading(false);
    setRefreshing(false);
  }, [session?.user]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
  }

  if (!session?.user) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>로그인 후 문의 내역을 볼 수 있습니다.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.activityIndicator} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
    >
      {error ? (
        <Text style={[styles.muted, { color: colors.destructive, marginBottom: 12 }]}>{error}</Text>
      ) : null}
      {rows.length === 0 ? (
        <Text style={styles.muted}>
          아직 문의가 없습니다. 화면 우측 상단 「새 문의」로 운영진에게 글을 남길 수 있습니다.
        </Text>
      ) : (
        rows.map((r) => (
          <Pressable key={r.id} style={styles.row} onPress={() => router.push(`/my-inquiry/${r.id}`)}>
            <Text style={styles.subject}>{r.subject}</Text>
            <Text style={styles.meta}>{new Date(r.created_at).toLocaleString('ko-KR')}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{statusText(r.status)}</Text>
            </View>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}
