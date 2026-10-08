import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../api/supabase';
import { unwrap } from '../api/errors';
import type { Company, Profile } from '../api/types';

interface AuthState {
  /** true until the stored session has been read from the keychain. */
  initializing: boolean;
  session: Session | null;
  profile: Profile | null;
  company: Company | null;
  profileLoading: boolean;
  profileError: unknown;
  sendCode: (email: string) => Promise<void>;
  verifyCode: (email: string, code: string) => Promise<void>;
  /** Test accounts only (enabled by EXPO_PUBLIC_TEST_LOGIN). */
  signInWithPassword: (email: string, password: string) => Promise<void>;
  /** Sign in with the link from the email (copied, or the page it opened). */
  verifyLink: (text: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setInitializing(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) qc.clear(); // never show the previous user's data
    });
    return () => data.subscription.unsubscribe();
  }, [qc]);

  const uid = session?.user.id;
  const profileQ = useQuery({
    queryKey: ['me', uid],
    enabled: !!uid,
    queryFn: async () => {
      const profile = unwrap(await supabase.from('profiles').select('*').eq('id', uid!).maybeSingle()) as Profile | null;
      let company: Company | null = null;
      if (profile?.company_id) {
        company = unwrap(await supabase.from('companies').select('*').eq('id', profile.company_id).single()) as Company;
      }
      return { profile, company };
    },
  });

  const sendCode = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: true } });
    if (error) throw error;
  }, []);

  const verifyCode = useCallback(async (email: string, code: string) => {
    const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'email' });
    if (error) throw error;
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) throw error;
  }, []);

  const verifyLink = useCallback(async (text: string) => {
    const get = (k: string) => {
      const m = text.match(new RegExp(`[?&#]${k}=([^&#\\s]+)`));
      return m ? decodeURIComponent(m[1]) : null;
    };
    // Case 1: the link was already opened; the redirect URL carries the session.
    const access = get('access_token');
    const refresh = get('refresh_token');
    if (access && refresh) {
      const { error } = await supabase.auth.setSession({ access_token: access, refresh_token: refresh });
      if (error) throw error;
      return;
    }
    // Case 2: the unopened link from the email (…/auth/v1/verify?token=…&type=…).
    const tokenHash = get('token_hash') ?? get('token');
    const type = get('type') ?? 'magiclink';
    if (!tokenHash || !/^[A-Za-z0-9_-]{10,}$/.test(tokenHash)) throw new Error('invalid_link');
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as 'magiclink' });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    qc.clear();
  }, [qc]);

  const refresh = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ['me'] });
  }, [qc]);

  const value = useMemo<AuthState>(
    () => ({
      initializing,
      session,
      profile: profileQ.data?.profile ?? null,
      company: profileQ.data?.company ?? null,
      profileLoading: !!uid && profileQ.isPending,
      profileError: profileQ.error,
      sendCode,
      verifyCode,
      verifyLink,
      signInWithPassword,
      signOut,
      refresh,
    }),
    [initializing, session, uid, profileQ.data, profileQ.isPending, profileQ.error, sendCode, verifyCode, verifyLink, signInWithPassword, signOut, refresh],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
