import { useLocale } from '@/context/LocaleContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { Link } from 'react-router-dom';

export function UnauthorizedPage() {
  const { locale, setLocale } = useLocale();
  const isEn = locale === 'en';
  const { profile, signOut } = useSession();
  const { preference, setPreference } = useTheme();

  return (
    <div className="card narrow">
      <div className="theme-picker login-theme">
        <span className="muted small">{isEn ? 'Theme' : '테마'}</span>
        <div className="theme-segments">
          <button
            type="button"
            className={`theme-chip${preference === 'light' ? ' active' : ''}`}
            onClick={() => setPreference('light')}
          >
            {isEn ? 'Light' : '라이트'}
          </button>
          <button
            type="button"
            className={`theme-chip${preference === 'dark' ? ' active' : ''}`}
            onClick={() => setPreference('dark')}
          >
            {isEn ? 'Dark' : '다크'}
          </button>
        </div>
      </div>
      <div className="theme-picker">
        <span className="muted small">{isEn ? 'Language' : '언어'}</span>
        <div className="theme-segments">
          <button type="button" className={`theme-chip${locale === 'ko' ? ' active' : ''}`} onClick={() => setLocale('ko')}>
            {isEn ? 'Korean' : '한국어'}
          </button>
          <button type="button" className={`theme-chip${locale === 'en' ? ' active' : ''}`} onClick={() => setLocale('en')}>
            {isEn ? 'English' : '영어'}
          </button>
        </div>
      </div>
      <h1>{isEn ? 'Unauthorized' : '권한 없음'}</h1>
      <p className="muted">
        {isEn
          ? <>Signed-in account (<strong>{profile?.nickname ?? '—'}</strong>) is not an admin.</>
          : <>로그인한 계정(<strong>{profile?.nickname ?? '—'}</strong>)은 관리자가 아닙니다.</>}
      </p>
      <p className="muted small">
        {isEn
          ? <>Promote in SQL Editor with <code>update public.profiles set is_admin = true where id = '…';</code>.</>
          : <>SQL Editor에서 <code>update public.profiles set is_admin = true where id = '…';</code> 로 승격할 수 있습니다.</>}
      </p>
      <button type="button" className="secondary" onClick={() => void signOut()}>
        {isEn ? 'Logout' : '로그아웃'}
      </button>
      <p>
        <Link to="/login">{isEn ? 'Back to login' : '로그인 화면으로'}</Link>
      </p>
    </div>
  );
}
