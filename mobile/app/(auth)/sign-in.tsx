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

export default function SignInScreen() {
  const { signIn } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    setBusy(true);
    const { error } = await signIn(email.trim(), password);
    setBusy(false);
    if (error) {
      Alert.alert('로그인 실패', userFacingAuthMessage(error));
      return;
    }
    router.replace('/');
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>로그인</Text>
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
        placeholder="비밀번호"
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
        <Text style={styles.buttonText}>{busy ? '처리 중…' : '로그인'}</Text>
      </Pressable>
      <Link href="/(auth)/sign-up" asChild>
        <Pressable style={styles.linkWrap}>
          <Text style={styles.link}>계정이 없으면 가입</Text>
        </Pressable>
      </Link>
    </KeyboardAvoidingView>
  );
}
