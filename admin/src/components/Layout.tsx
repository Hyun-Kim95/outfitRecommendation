import { useSession } from '@/context/SessionContext';
import { NavLink, Outlet } from 'react-router-dom';

export function Layout() {
  const { profile, signOut } = useSession();

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
        </nav>
        <div className="sidebar-foot">
          <span className="muted small">{profile?.nickname ?? profile?.id}</span>
          <button type="button" className="linkish" onClick={() => void signOut()}>
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
