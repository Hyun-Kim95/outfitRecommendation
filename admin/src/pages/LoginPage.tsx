import { useLocale } from '@/context/LocaleContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { getSupabase } from '@/lib/supabase';
import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

export function LoginPage() {
  const { locale, setLocale } = useLocale();
  const isEn = locale === 'en';
  const { ready, configured, session, profile, profileLoading, signIn } = useSession();
  const { preference, setPreference } = useTheme();
  const loc = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!configured) {
    return (
      <div className="card narrow">
        <h1>{isEn ? 'Environment variables' : '환경 변수'}</h1>
        <p className="muted">
          {isEn
            ? <><code>VITE_SUPABASE_URL</code>, <code>VITE_SUPABASE_ANON_KEY</code> in <code>.env</code> then restart the dev server.</>
            : <><code>VITE_SUPABASE_URL</code>, <code>VITE_SUPABASE_ANON_KEY</code> 를 <code>.env</code>에 설정한 뒤 개발 서버를 재시작하세요.</>}
        </p>
      </div>
    );
  }

  if (ready && session && !profileLoading && profile?.is_admin) {
    const to = (loc.state as { from?: { pathname?: string } })?.from?.pathname ?? '/';
    return <Navigate to={to} replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const { error } = await signIn(email.trim(), password);
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    const sb = getSupabase();
    const {
      data: { session: s },
    } = await sb.auth.getSession();
    if (!s?.user) {
      setErr(isEn ? 'Failed to create session.' : '세션을 만들지 못했습니다.');
      return;
    }
    const { data: p } = await sb.from('profiles').select('is_admin').eq('id', s.user.id).maybeSingle();
    if (p?.is_admin) navigate((loc.state as { from?: { pathname?: string } })?.from?.pathname ?? '/', {
      replace: true,
    });
    else navigate('/unauthorized', { replace: true });
  }

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
      <div className="theme-picker" role="group" aria-label={isEn ? 'Language' : '언어'}>
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
      <h1>{isEn ? 'Admin login' : '관리자 로그인'}</h1>
      <form onSubmit={onSubmit} className="form">
        <label>
          {isEn ? 'Email' : '이메일'}
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          {isEn ? 'Password' : '비밀번호'}
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {err ? <p className="error">{err}</p> : null}
        <button type="submit" disabled={busy}>
          {busy ? (isEn ? 'Signing in…' : '로그인 중…') : isEn ? 'Sign in' : '로그인'}
        </button>
      </form>
    </div>
  );
}
