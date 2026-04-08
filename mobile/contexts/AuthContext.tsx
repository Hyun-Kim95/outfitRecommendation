import { getSupabase } from '@/lib/supabase';
import { supabaseConfigured } from '@/lib/config';
import type { AuthError, Session, User } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';

type Profile = Database['public']['Tables']['profiles']['Row'];

type AuthState = {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | Error | null }>;
  signUp: (
    email: string,
    password: string
  ) => Promise<{ error: AuthError | Error | null; session: Session | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [initializing, setInitializing] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  /** 세션은 있는데 프로필 fetch 전/중이면 true — index가 온보딩으로 잘못 보내지 않게 함 */
  const loading = initializing || (!!session?.user && profileLoading);

  const loadProfile = useCallback(async (userId: string) => {
    setProfileLoading(true);
    try {
      const sb = getSupabase();
      if (!sb) {
        setProfile(null);
        return;
      }
      const { data, error } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle();
      const {
        data: { session: cur },
      } = await sb.auth.getSession();
      if (cur?.user?.id !== userId) return;

      if (error) {
        console.warn('profile load', error.message);
        setProfile(null);
        return;
      }
      if (data?.account_disabled) {
        Alert.alert(
          '이용 제한',
          '이 계정은 운영 정책에 따라 이용이 제한되었습니다. 필요하면 다른 채널로 운영진에게 연락해 주세요.'
        );
        await sb.auth.signOut();
        setProfile(null);
        return;
      }
      setProfile(data);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!supabaseConfigured) {
      setInitializing(false);
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      setInitializing(false);
      return;
    }

    let mounted = true;
    void (async () => {
      const {
        data: { session: s },
      } = await sb.auth.getSession();
      if (!mounted) return;
      setSession(s);
      if (s?.user) {
        await loadProfile(s.user.id);
      } else {
        setProfile(null);
      }
      if (mounted) setInitializing(false);
    })();

    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        void loadProfile(newSession.user.id);
      } else {
        setProfile(null);
        setProfileLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (session?.user) await loadProfile(session.user.id);
  }, [session?.user, loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const sb = getSupabase();
    if (!sb) return { error: new Error('Supabase 미설정') };
    const { error } = await sb.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const sb = getSupabase();
    if (!sb) return { error: new Error('Supabase 미설정'), session: null };
    const { data, error } = await sb.auth.signUp({ email, password });
    return { error, session: data.session ?? null };
  }, []);

  const signOut = useCallback(async () => {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    setProfile(null);
    setSession(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      configured: supabaseConfigured,
      loading,
      session,
      user: session?.user ?? null,
      profile,
      refreshProfile,
      signIn,
      signUp,
      signOut,
    }),
    [loading, session, profile, refreshProfile, signIn, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
