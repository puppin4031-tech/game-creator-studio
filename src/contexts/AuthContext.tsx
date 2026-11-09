import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isMainAdmin: boolean;
  isSubAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// Keep one context instance across hot reloads so providers and consumers never diverge.
const globalAuth = globalThis as { __colonionAuthContext?: React.Context<AuthContextType | undefined> };
const AuthContext = globalAuth.__colonionAuthContext ?? createContext<AuthContextType | undefined>(undefined);
globalAuth.__colonionAuthContext = AuthContext;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    setProfile(data);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        // Use setTimeout to avoid Supabase deadlock
        setTimeout(() => fetchProfile(session.user.id), 0);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    // Restore persisted sign-in only after validating it with the auth server.
    let active = true;
    supabase.auth.getUser().then(({ data: { user: restoredUser }, error }) => {
      if (!active) return;
      if (!error) {
        setUser(restoredUser);
        if (restoredUser) void fetchProfile(restoredUser.id);
      }
    }).catch(() => {
      // A temporary network failure must not delete the persisted session.
    }).finally(() => {
      if (active) setIsLoading(false);
    });

    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        isMainAdmin: profile?.role === 'main_admin',
        isSubAdmin: profile?.role === 'sub_admin',
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

const SIGNED_OUT: AuthContextType = {
  user: null, profile: null, isLoading: true, isMainAdmin: false, isSubAdmin: false,
  signIn: async () => ({ error: '잠시 후 다시 시도해 주세요.' }),
  signUp: async () => ({ error: '잠시 후 다시 시도해 주세요.' }),
  signOut: async () => {}, refreshProfile: async () => {},
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    // A stale hot-reload module can briefly miss the provider; render signed-out instead of blanking.
    console.warn('useAuth used outside AuthProvider; using signed-out fallback');
    return SIGNED_OUT;
  }
  return ctx;
}
