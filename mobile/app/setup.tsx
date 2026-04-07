import { StyleSheet, Text, View } from 'react-native';

export default function SetupScreen() {
  return (
    <View style={styles.box}>
      <Text style={styles.title}>Supabase 환경 변수 필요</Text>
      <Text style={styles.body}>
        `mobile` 폴더에 `.env` 파일을 만들고 다음을 설정하세요:{'\n\n'}
        EXPO_PUBLIC_SUPABASE_URL=…{'\n'}
        EXPO_PUBLIC_SUPABASE_ANON_KEY=…{'\n\n'}
        Supabase 대시보드에서 SQL 마이그레이션(`supabase/migrations`)을 적용한 뒤 다시 실행하세요.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  body: { fontSize: 15, lineHeight: 22, color: '#444' },
});
