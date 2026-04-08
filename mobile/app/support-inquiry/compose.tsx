import { useAuth } from '@/contexts/AuthContext';
import { getSupabase } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/lib/theme-colors';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background, padding: 16 },
    label: { fontSize: 13, color: c.mutedForeground, marginBottom: 6 },
    input: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      padding: 12,
      fontSize: 16,
      color: c.foreground,
      backgroundColor: c.card,
      marginBottom: 16,
    },
    body: { minHeight: 140, textAlignVertical: 'top' },
    btn: {
      backgroundColor: c.primary,
      padding: 14,
      borderRadius: 10,
      alignItems: 'center',
      marginTop: 8,
    },
    btnText: { color: c.primaryForeground, fontWeight: '600', fontSize: 16 },
    hint: { fontSize: 12, color: c.mutedForeground, marginTop: 12, lineHeight: 18 },
  });
}

export default function SupportInquiryComposeScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  async function onSubmit() {
    const sb = getSupabase();
    if (!user?.id || !sb) {
      Alert.alert('문의', '로그인이 필요합니다.');
      return;
    }
    const s = subject.trim();
    const b = body.trim();
    if (s.length < 2) {
      Alert.alert('문의', '제목을 2글자 이상 입력해 주세요.');
      return;
    }
    if (b.length < 5) {
      Alert.alert('문의', '내용을 5글자 이상 입력해 주세요.');
      return;
    }
    setSending(true);
    try {
      const { error } = await sb.from('support_tickets').insert({
        user_id: user.id,
        subject: s,
        body: b,
      });
      if (error) throw error;
      Alert.alert('문의', '접수되었습니다. 순차적으로 답변드리겠습니다.', [
        { text: '확인', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert('문의', e instanceof Error ? e.message : '전송에 실패했습니다.');
    } finally {
      setSending(false);
    }
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>제목</Text>
      <TextInput
        style={styles.input}
        value={subject}
        onChangeText={setSubject}
        placeholder="문의 제목"
        placeholderTextColor={colors.mutedForeground}
        editable={!sending}
      />
      <Text style={styles.label}>내용</Text>
      <TextInput
        style={[styles.input, styles.body]}
        value={body}
        onChangeText={setBody}
        placeholder="문의 내용을 적어 주세요."
        placeholderTextColor={colors.mutedForeground}
        multiline
        editable={!sending}
      />
      <Pressable style={styles.btn} onPress={() => void onSubmit()} disabled={sending}>
        {sending ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <Text style={styles.btnText}>보내기</Text>
        )}
      </Pressable>
      <Text style={styles.hint}>
        운영진이 관리자 콘솔에서 문의를 확인합니다. 긴급한 보안 이슈는 별도 채널을 이용해 주세요.
      </Text>
    </ScrollView>
  );
}
