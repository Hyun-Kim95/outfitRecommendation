import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { userFacingAuthMessage } from '@/lib/auth-errors';
import type { ThemeColors } from '@/lib/theme-colors';
import { Link, router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: c.background },
    title: { fontSize: 24, fontWeight: '700', marginBottom: 24, color: c.foreground },
    input: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 10,
      padding: 14,
      marginBottom: 12,
      backgroundColor: c.inputBg,
      color: c.foreground,
      fontSize: 16,
    },
    button: {
      backgroundColor: c.primary,
      padding: 16,
      borderRadius: 10,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: c.primaryForeground, fontWeight: '600', fontSize: 16 },
    linkWrap: { marginTop: 20, alignItems: 'center' },
    link: { color: c.primary, fontSize: 15 },
  });
}

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    setBusy(true);
    const trimmed = email.trim();
    const { error, session } = await signUp(trimmed, password);
    setBusy(false);
    if (error) {
      Alert.alert('가입 실패', userFacingAuthMessage(error));
      return;
    }
    if (session) {
      Alert.alert('가입 완료', '회원가입이 완료되었습니다. 다음 단계로 이동합니다.', [
        { text: '확인', onPress: () => router.replace('/') },
      ]);
      return;
    }
    Alert.alert(
      '인증 메일을 보냈어요',
      `${trimmed} 주소로 인증 메일을 보냈습니다.\n\n메일함과 스팸함을 확인한 뒤, 메일의 링크로 인증을 마친 다음 로그인해 주세요.`,
      [{ text: '로그인 화면으로', onPress: () => router.replace('/(auth)/sign-in') }]
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>회원가입</Text>
      <TextInput
        style={styles.input}
        placeholder="이메일"
        placeholderTextColor={colors.mutedForeground}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="비밀번호 (6자 이상 권장)"
        placeholderTextColor={colors.mutedForeground}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Pressable
        style={[styles.button, busy && styles.buttonDisabled]}
        onPress={onSubmit}
        disabled={busy}
      >
        <Text style={styles.buttonText}>{busy ? '처리 중…' : '가입'}</Text>
      </Pressable>
      <Link href="/(auth)/sign-in" asChild>
        <Pressable style={styles.linkWrap}>
          <Text style={styles.link}>이미 계정이 있음</Text>
        </Pressable>
      </Link>
    </KeyboardAvoidingView>
  );
}
