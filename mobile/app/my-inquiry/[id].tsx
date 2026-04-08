import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { getSupabase } from '@/lib/supabase';
import type { ThemeColors } from '@/lib/theme-colors';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

function statusText(status: string): string {
  if (status === 'answered') return '답변 완료';
  return '답변 대기';
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: 16, paddingBottom: 32 },
    label: { fontSize: 13, color: c.mutedForeground, marginBottom: 6, marginTop: 16 },
    labelFirst: { fontSize: 13, color: c.mutedForeground, marginBottom: 6 },
    box: {
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: c.border,
    },
    body: { fontSize: 15, color: c.foreground, lineHeight: 22 },
    meta: { fontSize: 12, color: c.mutedForeground, marginBottom: 8 },
    title: { fontSize: 18, fontWeight: '700', color: c.foreground },
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
    muted: { color: c.mutedForeground, textAlign: 'center' },
    error: { color: c.destructive, textAlign: 'center' },
  });
}

type Row = {
  id: string;
  subject: string;
  body: string;
  admin_reply: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export default function MyInquiryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [row, setRow] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || !session?.user || !id || typeof id !== 'string') {
      setRow(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: qErr } = await sb
      .from('support_tickets')
      .select('id, subject, body, admin_reply, status, created_at, updated_at')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .maybeSingle();
    if (qErr) {
      setError(qErr.message);
      setRow(null);
    } else {
      setRow(data as Row | null);
    }
    setLoading(false);
  }, [id, session?.user]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!session?.user) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>로그인이 필요합니다.</Text>
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

  if (error || !row) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error ?? '문의를 찾을 수 없습니다.'}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{row.subject}</Text>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{statusText(row.status)}</Text>
      </View>
      <Text style={styles.meta}>
        접수 {new Date(row.created_at).toLocaleString('ko-KR')}
        {row.updated_at !== row.created_at
          ? ` · 갱신 ${new Date(row.updated_at).toLocaleString('ko-KR')}`
          : ''}
      </Text>
      <Text style={styles.labelFirst}>내 문의</Text>
      <View style={styles.box}>
        <Text style={styles.body}>{row.body}</Text>
      </View>
      <Text style={styles.label}>운영진 답변</Text>
      <View style={styles.box}>
        <Text style={styles.body}>
          {row.admin_reply && row.admin_reply.trim().length > 0
            ? row.admin_reply
            : '아직 답변이 등록되지 않았습니다.'}
        </Text>
      </View>
    </ScrollView>
  );
}
