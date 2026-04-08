import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { Link } from 'react-router-dom';

export function UnauthorizedPage() {
  const { profile, signOut } = useSession();
  const { preference, setPreference } = useTheme();

  return (
    <div className="card narrow">
      <div className="theme-picker login-theme">
        <span className="muted small">테마</span>
        <div className="theme-segments">
          <button
            type="button"
            className={`theme-chip${preference === 'light' ? ' active' : ''}`}
            onClick={() => setPreference('light')}
          >
            라이트
          </button>
          <button
            type="button"
            className={`theme-chip${preference === 'dark' ? ' active' : ''}`}
            onClick={() => setPreference('dark')}
          >
            다크
          </button>
        </div>
      </div>
      <h1>권한 없음</h1>
      <p className="muted">
        로그인한 계정(<strong>{profile?.nickname ?? '—'}</strong>)은 관리자가 아닙니다.
      </p>
      <p className="muted small">
        SQL Editor에서 <code>update public.profiles set is_admin = true where id = '…';</code> 로 승격할 수
        있습니다.
      </p>
      <button type="button" className="secondary" onClick={() => void signOut()}>
        로그아웃
      </button>
      <p>
        <Link to="/login">로그인 화면으로</Link>
      </p>
    </div>
  );
}
