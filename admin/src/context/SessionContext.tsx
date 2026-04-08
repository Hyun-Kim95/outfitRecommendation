import { getSupabase, supabaseConfigured } from '@/lib/supabase';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/** 이 이벤트들은 세션 토큰만 바뀌거나 초기 리스너 등록 시 중복이 나와 프로필을 다시 불러올 필요 없음 */
function shouldReloadProfileOnAuthEvent(event: AuthChangeEvent): boolean {
  return event !== 'INITIAL_SESSION' && event !== 'TOKEN_REFRESHED';
}

export type AdminProfile = {
  id: string;
  nickname: string | null;
  is_admin: boolean;
  account_disabled?: boolean;
  created_at: string;
  default_region: string | null;
};

type Ctx = {
  ready: boolean;
  configured: boolean;
  profileLoading: boolean;
  session: Session | null;
  user: User | null;
  profile: AdminProfile | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const SessionContext = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AdminProfile | null>(null);

  const loadProfile = useCallback(async (userId: string) => {
    setProfileLoading(true);
    try {
      const sb = getSupabase();
      const { data, error } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (error) {
        console.error(error);
        setProfile(null);
        return;
      }
      if (!data) {
        setProfile(null);
        return;
      }
      setProfile(data as AdminProfile);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!supabaseConfigured) {
      setReady(true);
      return;
    }
    const sb = getSupabase();
    let mounted = true;
    void (async () => {
      const {
        data: { session: s },
      } = await sb.auth.getSession();
      if (!mounted) return;
      setSession(s);
      if (s?.user) await loadProfile(s.user.id);
      else setProfile(null);
      if (mounted) setReady(true);
    })();

    const { data: sub } = sb.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (!s?.user) {
        setProfile(null);
        return;
      }
      if (shouldReloadProfileOnAuthEvent(event)) {
        void loadProfile(s.user.id);
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const sb = getSupabase();
      const { error } = await sb.auth.signInWithPassword({ email, password });
      return { error: error ? new Error(error.message) : null };
    } catch (e) {
      return { error: e instanceof Error ? e : new Error('로그인 실패') };
    }
  }, []);

  const signOut = useCallback(async () => {
    const sb = getSupabase();
    await sb.auth.signOut();
    setProfile(null);
    setSession(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user) await loadProfile(session.user.id);
  }, [session?.user, loadProfile]);

  const value = useMemo<Ctx>(
    () => ({
      ready,
      configured: supabaseConfigured,
      profileLoading,
      session,
      user: session?.user ?? null,
      profile,
      signIn,
      signOut,
      refreshProfile,
    }),
    [ready, profileLoading, session, profile, signIn, signOut, refreshProfile]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('SessionProvider 필요');
  return ctx;
}
