import { Redirect } from 'expo-router';

/** 이전 경로 호환: 문의 목록은 `/support-inquiry`로 통합됨 */
export default function MyInquiriesRedirect() {
  return <Redirect href="/support-inquiry" />;
}
