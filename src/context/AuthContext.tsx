/**
 * AuthContext - Global Authentication State Management
 *
 * Provides authentication state, user profile, companion status,
 * and related actions throughout the application.
 */
import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { Companion } from '@/types';
import type { User } from '@supabase/supabase-js';
import { toast } from 'sonner';

/** Auth context value interface */
interface AuthContextType {
  /** Whether the user is currently authenticated */
  isAuthenticated: boolean;
  /** Current Supabase user object */
  user: User | null;
  /** User's companion profile, null if not created yet */
  companion: Companion | null;
  /** Whether the user has a companion */
  hasCompanion: boolean;
  /** Loading state for initial auth check */
  isLoading: boolean;
  /** Sign out the current user */
  logout: () => Promise<void>;
  /** Re-fetch companion data from Supabase */
  refreshCompanion: () => Promise<void>;
}

// Create the context with undefined default
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Hook to access the auth context. Must be used within an AuthProvider. */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/** Props for the AuthProvider component */
interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * AuthProvider - Wraps the application to provide global auth state.
 *
 * Listens to Supabase auth state changes and automatically:
 * - Updates user object on sign in / sign out / token refresh
 * - Queries the companions table to check companion status
 * - Handles loading states for initial session recovery
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [companion, setCompanion] = useState<Companion | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Use a ref to track whether the initial session check is complete.
  // This prevents the onAuthStateChange listener from overwriting the
  // recovered session with a stale value.
  const initialCheckDone = useRef(false);

  /**
   * Fetch the user's companion from Supabase.
   * Queries the 'companions' table for a row matching the user's ID.
   */
  const fetchCompanion = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('companions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        // Silently handle no-row errors; log others
        if (error.code !== 'PGRST116') {
          console.error('[AuthContext] Error fetching companion:', error.message);
        }
        setCompanion(null);
        return;
      }

      if (data) {
        // Map DB row to Companion type
        const mapped: Companion = {
          id: data.id,
          name: data.name ?? '',
          avatar: data.avatar ?? '',
          description: data.description ?? '',
          personality: data.personality ?? {},
          tags: data.tags ?? [],
          isDefault: data.is_default ?? false,
          createdAt: data.created_at,
        };
        setCompanion(mapped);
      } else {
        setCompanion(null);
      }
    } catch (err) {
      console.error('[AuthContext] Unexpected error in fetchCompanion:', err);
      setCompanion(null);
    }
  }, []);

  /**
   * Check the current session on mount.
   * This runs once to recover any existing session from localStorage.
   */
  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (cancelled) return;

        if (error) {
          console.error('[AuthContext] getSession error:', error.message);
          setUser(null);
          setCompanion(null);
        } else if (data.session?.user) {
          setUser(data.session.user);
          await fetchCompanion(data.session.user.id);
        }
      } catch (err) {
        console.error('[AuthContext] Session check failed:', err);
        setUser(null);
        setCompanion(null);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          initialCheckDone.current = true;
        }
      }
    }

    checkSession();

    return () => {
      cancelled = true;
    };
  }, [fetchCompanion]);

  /**
   * Subscribe to Supabase auth state changes.
   * Handles SIGNED_IN, SIGNED_OUT, and TOKEN_REFRESHED events.
   */
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Skip until initial getSession() completes to avoid race conditions
        if (!initialCheckDone.current) return;

        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (event === 'SIGNED_IN' && currentUser) {
          await fetchCompanion(currentUser.id);
          toast.success('Signed in successfully');
        } else if (event === 'SIGNED_OUT') {
          setCompanion(null);
          toast.info('Signed out');
        } else if (event === 'TOKEN_REFRESHED' && currentUser) {
          // Companion data likely unchanged, but refresh just in case
          await fetchCompanion(currentUser.id);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchCompanion]);

  /** Sign out the current user via Supabase. */
  const logout = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error(`Sign out failed: ${error.message}`);
        throw error;
      }
      // State cleanup is handled by onAuthStateChange SIGNED_OUT event
    } catch (err) {
      console.error('[AuthContext] Logout error:', err);
      throw err;
    }
  }, []);

  /** Manually refresh companion data. */
  const refreshCompanion = useCallback(async () => {
    if (!user?.id) {
      setCompanion(null);
      return;
    }
    await fetchCompanion(user.id);
  }, [user, fetchCompanion]);

  const value: AuthContextType = {
    isAuthenticated: user !== null,
    user,
    companion,
    hasCompanion: companion !== null,
    isLoading,
    logout,
    refreshCompanion,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
