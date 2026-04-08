import { useSession } from '@/context/SessionContext';
import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

export function RequireAdmin() {
  const { ready, configured, session, profile, profileLoading, signOut } = useSession();
  const loc = useLocation();

  useEffect(() => {
    if (profile?.account_disabled) {
      void signOut();
    }
  }, [profile?.account_disabled, signOut]);

  if (!configured) {
    return (
      <div className="card narrow">
        <h1>환경 변수</h1>
        <p className="muted">
          <code>VITE_SUPABASE_URL</code>, <code>VITE_SUPABASE_ANON_KEY</code> 를 설정하세요.
        </p>
      </div>
    );
  }

  // 프로필이 이미 있으면 토큰 갱신 등으로 profileLoading이 잠깐 true여도 화면을 가리지 않음(깜빡임 방지)
  const waitingForFirstProfile = Boolean(session && profileLoading && !profile);
  if (!ready || waitingForFirstProfile) {
    return (
      <div className="center-screen">
        <p className="muted">세션 확인 중…</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: loc }} />;
  }

  if (!profile) {
    return (
      <div className="card narrow">
        <h1>프로필 없음</h1>
        <p className="muted">auth.users에는 있으나 public.profiles 행이 없습니다.</p>
      </div>
    );
  }

  if (!profile.is_admin) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (profile.account_disabled) {
    return (
      <div className="center-screen">
        <p className="muted">이용이 제한된 계정입니다. 로그아웃하는 중…</p>
      </div>
    );
  }

  return <Outlet />;
}
