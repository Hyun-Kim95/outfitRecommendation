import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useTheme } from '@/contexts/ThemeContext';
import { computeInsightSummary } from '@/lib/insightsStats';
import { fetchOutfitsWithRelations } from '@/lib/queries';
import type { ThemeColors } from '@/lib/theme-colors';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    scroll: { padding: 16, paddingBottom: 40, backgroundColor: c.background },
    lead: {
      fontSize: 15,
      color: c.mutedForeground,
      lineHeight: 22,
      marginBottom: 16,
    },
    card: {
      backgroundColor: c.card,
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: c.border,
    },
    cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10, color: c.foreground },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    label: { color: c.mutedForeground, fontSize: 14 },
    value: { color: c.foreground, fontSize: 16, fontWeight: '600' },
    tagRow: { marginTop: 4 },
    tagLine: { fontSize: 14, color: c.foreground, marginBottom: 4 },
    foot: { fontSize: 13, color: c.mutedForeground, marginTop: 12, lineHeight: 20 },
  });
}

export default function InsightsScreen() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ReturnType<typeof computeInsightSummary> | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) {
      setSummary(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const outfits = await fetchOutfitsWithRelations(user.id);
      setSummary(computeInsightSummary(outfits));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 48 }} color={colors.activityIndicator} />;
  }

  if (!summary) {
    return (
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.lead}>
          {isEn
            ? 'Once records accumulate after sign-in, you can see satisfaction and context patterns.'
            : '로그인 후 기록이 쌓이면 만족도와 상황 패턴을 볼 수 있어요.'}
        </Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.lead}>
        {isEn
          ? 'The more weather/context/feeling/satisfaction you record, the more accurate recommendations and "Similar Days" become.'
          : '날씨·상황·체감·만족도를 남길수록 추천과 "비슷한 날"이 정확해집니다.'}
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{isEn ? 'Summary' : '요약'}</Text>
        <View style={styles.row}>
          <Text style={styles.label}>{isEn ? 'Outfit logs' : '착장 기록'}</Text>
          <Text style={styles.value}>{summary.outfitCount}{isEn ? '' : '건'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>{isEn ? 'Recorded days' : '기록한 날'}</Text>
          <Text style={styles.value}>{summary.distinctDays}{isEn ? '' : '일'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>{isEn ? 'Feedback entries' : '감상(회고) 항목'}</Text>
          <Text style={styles.value}>{summary.feedbackEntryCount}{isEn ? '' : '건'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>{isEn ? 'Outfits with feedback' : '감상이 있는 착장'}</Text>
          <Text style={styles.value}>{summary.outfitsWithAnyFeedback}{isEn ? '' : '건'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>{isEn ? 'Average satisfaction' : '평균 만족도'}</Text>
          <Text style={styles.value}>
            {summary.avgSatisfaction != null ? `${summary.avgSatisfaction} / 5` : '—'}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{isEn ? 'Top context tags' : '자주 찍은 상황 태그'}</Text>
        {summary.topSituationTags.length === 0 ? (
          <Text style={styles.lead}>
            {isEn
              ? 'No tags yet. Try selecting context tags while logging outfits.'
              : '아직 태그가 없어요. 착장 기록에서 상황을 골라 보세요.'}
          </Text>
        ) : (
          <View style={styles.tagRow}>
            {summary.topSituationTags.map(({ tag, count }) => (
              <Text key={tag} style={styles.tagLine}>
                {tag} · {count}{isEn ? '' : '회'}
              </Text>
            ))}
          </View>
        )}
      </View>

      <Text style={styles.foot}>
        {isEn
          ? 'Even short daily logs build patterns. Home recommendations consider both past satisfaction and similar weather/context.'
          : '매일 짧게 기록해도 패턴이 쌓입니다. 홈의 추천은 과거 만족도와 비슷한 날씨·상황을 함께 봅니다.'}
      </Text>
    </ScrollView>
  );
}
