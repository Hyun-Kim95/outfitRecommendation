import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { NavLink, Outlet } from 'react-router-dom';

export function Layout() {
  const { profile, signOut } = useSession();
  const { preference, setPreference } = useTheme();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">착장 앱 · 관리</div>
        <nav className="nav">
          <NavLink to="/" end>
            대시보드
          </NavLink>
          <NavLink to="/users">사용자</NavLink>
          <NavLink to="/outfits">착장 기록</NavLink>
          <NavLink to="/inquiries">문의</NavLink>
          <NavLink to="/notices">공지</NavLink>
        </nav>
        <div className="sidebar-foot">
          <div className="theme-picker" role="group" aria-label="테마">
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
          <span className="muted small">{profile?.nickname ?? profile?.id}</span>
          <button type="button" className="btn-logout" onClick={() => void signOut()}>
            로그아웃
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
