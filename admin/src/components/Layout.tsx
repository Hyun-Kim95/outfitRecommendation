import { useLocale } from '@/context/LocaleContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { NavLink, Outlet } from 'react-router-dom';

export function Layout() {
  const { profile, signOut } = useSession();
  const { preference, setPreference } = useTheme();
  const { locale, setLocale, t } = useLocale();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">{t('layout.brand')}</div>
        <nav className="nav">
          <NavLink to="/" end>
            {t('layout.nav.dashboard')}
          </NavLink>
          <NavLink to="/users">{t('layout.nav.users')}</NavLink>
          <NavLink to="/outfits">{t('layout.nav.outfits')}</NavLink>
          <NavLink to="/inquiries">{t('layout.nav.inquiries')}</NavLink>
          <NavLink to="/notices">{t('layout.nav.notices')}</NavLink>
        </nav>
        <div className="sidebar-foot">
          <div className="theme-picker" role="group" aria-label={t('layout.theme')}>
            <span className="muted small">{t('layout.theme')}</span>
            <div className="theme-segments">
              <button
                type="button"
                className={`theme-chip${preference === 'light' ? ' active' : ''}`}
                onClick={() => setPreference('light')}
              >
                {t('layout.theme.light')}
              </button>
              <button
                type="button"
                className={`theme-chip${preference === 'dark' ? ' active' : ''}`}
                onClick={() => setPreference('dark')}
              >
                {t('layout.theme.dark')}
              </button>
            </div>
          </div>
          <div className="theme-picker" role="group" aria-label={t('layout.language')}>
            <span className="muted small">{t('layout.language')}</span>
            <div className="theme-segments">
              <button
                type="button"
                className={`theme-chip${locale === 'ko' ? ' active' : ''}`}
                onClick={() => setLocale('ko')}
              >
                {t('layout.language.ko')}
              </button>
              <button
                type="button"
                className={`theme-chip${locale === 'en' ? ' active' : ''}`}
                onClick={() => setLocale('en')}
              >
                {t('layout.language.en')}
              </button>
            </div>
          </div>
          <span className="muted small">{profile?.nickname ?? profile?.id}</span>
          <button type="button" className="btn-logout" onClick={() => void signOut()}>
            {t('layout.logout')}
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
