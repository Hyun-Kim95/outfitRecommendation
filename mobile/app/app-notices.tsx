import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { getSupabase } from '@/lib/supabase';
import type { ThemeColors } from '@/lib/theme-colors';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Notice = {
  id: string;
  title: string;
  body: string;
  starts_at: string;
  ends_at: string | null;
  is_pinned?: boolean;
};

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    scrollContent: { padding: 16, paddingBottom: 32 },
    card: {
      backgroundColor: c.card,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      gap: 12,
    },
    headerTextWrap: { flex: 1 },
    title: { fontSize: 16, fontWeight: '700', color: c.foreground },
    meta: { fontSize: 12, color: c.mutedForeground, marginTop: 6 },
    chevron: { fontSize: 12, color: c.mutedForeground, fontWeight: '700' },
    bodyWrap: { paddingHorizontal: 16, paddingBottom: 16 },
    body: { fontSize: 15, color: c.foreground, lineHeight: 22 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    muted: { color: c.mutedForeground, textAlign: 'center', lineHeight: 20 },
  });
}

export default function AppNoticesScreen() {
  const { session } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [items, setItems] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || !session?.user) {
      setItems([]);
      setLoading(false);
      return;
    }
    setError(null);
    const { data, error: qErr } = await sb
      .from('app_notices')
      .select('id, title, body, starts_at, ends_at, is_pinned')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });
    if (qErr) {
      setError(qErr.message);
      setItems([]);
    } else {
      setItems((data ?? []) as Notice[]);
    }
    setLoading(false);
    setRefreshing(false);
  }, [session?.user]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
  }

  function toggle(id: string) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  if (!session?.user) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>로그인 후 공지를 볼 수 있습니다.</Text>
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
      {items.length === 0 ? (
        <Text style={styles.muted}>표시 중인 공지가 없습니다.</Text>
      ) : (
        items.map((n) => {
          const isOpen = !!expanded[n.id];
          return (
            <View key={n.id} style={styles.card}>
              <Pressable
                style={styles.header}
                onPress={() => toggle(n.id)}
                accessibilityRole="button"
                accessibilityState={{ expanded: isOpen }}
              >
                <View style={styles.headerTextWrap}>
                  <Text style={styles.title}>{n.title}</Text>
                  <Text style={styles.meta}>
                    게시 {new Date(n.starts_at).toLocaleDateString('ko-KR', { dateStyle: 'medium' })}
                  </Text>
                </View>
                <Text style={styles.chevron}>{isOpen ? '▲' : '▼'}</Text>
              </Pressable>
              {isOpen ? (
                <View style={styles.bodyWrap}>
                  <Text style={styles.body}>{n.body}</Text>
                </View>
              ) : null}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}
