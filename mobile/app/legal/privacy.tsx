import { useTheme } from '@/contexts/ThemeContext';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

export default function PrivacyScreen() {
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
      <Text style={styles.h}>개인정보 처리방침 (요약)</Text>
      <Text style={styles.p}>
        운영자는 개인정보 보호법 등 관련 법령을 준수합니다. 아래는 MVP 단계 요약이며, 정식 배포 전 법무 검토로
        전문을 마련해야 합니다.
      </Text>
      <Text style={styles.h}>수집 항목</Text>
      <Text style={styles.p}>
        계정(이메일 등 인증 정보), 프로필(닉네임·선호 지역·민감도 설정 등), 착장·감상·문의 등 서비스 이용 과정에서
        입력하거나 생성되는 데이터가 저장될 수 있습니다.
      </Text>
      <Text style={styles.h}>이용 목적</Text>
      <Text style={styles.p}>
        서비스 제공·맞춤 추천·고객 지원·통계(익명화 가능 시) 및 부정 이용 방지에 활용합니다.
      </Text>
      <Text style={styles.h}>보관 및 파기</Text>
      <Text style={styles.p}>
        목적 달성 후 지체 없이 파기하되, 관련 법령에 따라 일정 기간 보관이 필요한 경우 해당 기간 동안 보관합니다.
      </Text>
      <Text style={styles.h}>제3자 제공·처리위탁</Text>
      <Text style={styles.p}>
        인증·호스팅·날씨 API 등 서비스 운영에 필요한 범위에서 이용될 수 있으며, 위탁 시 계약 등으로 안전성을 확보합니다.
      </Text>
      <Text style={styles.h}>회원의 권리</Text>
      <Text style={styles.p}>
        프로필 수정·문의를 통해 열람·정정·삭제를 요청할 수 있으며, 탈퇴 시 계정 비활성화 등 정책에 따라 처리됩니다.
      </Text>
      <Text style={styles.h}>문의</Text>
      <Text style={styles.p}>앱 내 문의 기능 또는 운영자가 안내하는 채널로 연락할 수 있습니다.</Text>
    </ScrollView>
  );
}
