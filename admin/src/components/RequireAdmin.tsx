import { useSession } from '@/context/SessionContext';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

export function RequireAdmin() {
  const { ready, configured, session, profile, profileLoading } = useSession();
  const loc = useLocation();

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

  if (!ready || (session && profileLoading)) {
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

  return <Outlet />;
}
