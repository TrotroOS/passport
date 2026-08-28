import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, apiFetch, getApiBaseUrl } from "@/lib/supabase";
import type { UserProfile } from "@/types/database";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setProfile(null);
        return;
      }

      const { data } = await supabase
        .from("users")
        .select(
          "id, email, full_name, organization_id, role, created_at, is_platform_admin, organizations(name)"
        )
        .eq("id", user.id)
        .maybeSingle();

      setProfile((data as UserProfile | null) ?? null);
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session: s } }) => {
        setSession(s);
      })
      .catch(() => setSession(null))
      .finally(() => setLoading(false));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) {
      refreshProfile();
    } else {
      setProfile(null);
    }
  }, [session, refreshProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return error.message;
      if (data.session) {
        setSession(data.session);
      }
      return null;
    } catch {
      return "Network error. Check your internet connection.";
    }
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, fullName: string) => {
      try {
        const res = await apiFetch("/api/auth/mobile/signup", {
          method: "POST",
          body: JSON.stringify({ email, password, fullName }),
        });
        const json = await res.json();
        if (!res.ok) return json.error ?? "Signup failed";

        if (json.session) {
          await supabase.auth.setSession(json.session);
        }
        return null;
      } catch {
        return `Cannot reach server at ${getApiBaseUrl()}. Start the backend with "npm run dev" on your computer.`;
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      signIn,
      signUp,
      signOut,
      refreshProfile,
    }),
    [session, profile, loading, signIn, signUp, signOut, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
