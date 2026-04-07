import { useSession } from '@/context/SessionContext';
import { Link } from 'react-router-dom';

export function UnauthorizedPage() {
  const { profile, signOut } = useSession();

  return (
    <div className="card narrow">
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
