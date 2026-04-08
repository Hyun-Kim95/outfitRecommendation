import { useTheme } from '@/contexts/ThemeContext';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

export default function TermsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: { padding: 16, paddingBottom: 40, backgroundColor: colors.background },
        p: { color: colors.foreground, fontSize: 15, lineHeight: 24, marginBottom: 14 },
        h: { fontWeight: '700', fontSize: 17, color: colors.foreground, marginTop: 8, marginBottom: 10 },
      }),
    [colors]
  );

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.h}>서비스 이용약관 (요약)</Text>
      <Text style={styles.p}>
        본 약관은 본 앱(이하 &quot;서비스&quot;)을 이용하는 회원과 운영자 간 권리·의무 및 책임사항을 규정합니다. 실제
        서비스 출시 전에는 법률 검토를 거쳐 전문을 보완해야 합니다.
      </Text>
      <Text style={styles.h}>제1조 (목적)</Text>
      <Text style={styles.p}>날씨·착장 기록·감상 등 기능을 제공하고, 회원이 이를 이용하는 조건을 정합니다.</Text>
      <Text style={styles.h}>제2조 (계정)</Text>
      <Text style={styles.p}>
        회원은 이메일 등으로 계정을 만들며, 프로필·착장 데이터는 본인 계정에 연동됩니다. 계정 보안은 회원이 관리합니다.
      </Text>
      <Text style={styles.h}>제3조 (서비스 변경·중단)</Text>
      <Text style={styles.p}>
        운영상·기술상 필요 시 서비스 내용을 변경하거나 일시 중단할 수 있으며, 가능한 범위에서 사전 또는 사후 공지합니다.
      </Text>
      <Text style={styles.h}>제4조 (탈퇴)</Text>
      <Text style={styles.p}>
        회원은 앱 설정에서 탈퇴를 요청할 수 있으며, 탈퇴 시 계정은 비활성화되어 서비스 이용이 제한될 수 있습니다.
      </Text>
      <Text style={styles.h}>제5조 (면책)</Text>
      <Text style={styles.p}>
        날씨 정보는 외부 API를 기반으로 하며 정확성을 보장하지 않습니다. 착장 추천·기록은 참고용이며, 개인의 판단과
        안전에 책임을 집니다.
      </Text>
    </ScrollView>
  );
}
