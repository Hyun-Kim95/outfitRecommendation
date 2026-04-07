import type { AuthError } from '@supabase/supabase-js';

/**
 * Supabase Auth 오류를 알림용 한국어 문구로 바꿉니다.
 * 429 = 짧은 시간에 가입·이메일 요청이 많을 때(프로젝트·플랜별 한도).
 */
export function userFacingAuthMessage(error: AuthError | Error | null | undefined): string {
  if (!error) return '';
  const status = 'status' in error ? (error as AuthError).status : undefined;
  const msg = error.message.toLowerCase();
  if (
    status === 429 ||
    msg.includes('rate limit') ||
    msg.includes('too many requests') ||
    msg.includes('too_many_requests')
  ) {
    return [
      '이메일 가입·전송 요청이 너무 많아 잠시 막혔습니다.',
      '몇 분 뒤 다시 시도하거나, 이미 만든 계정이 있으면 로그인해 주세요.',
      '(Supabase 무료 플랜은 가입·메일 발송 횟수 제한이 있습니다.)',
    ].join('\n');
  }
  return error.message;
}
