import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface AuthState {
  isAuthenticated: boolean;
  user: { id: string; email: string } | null;
  hasCompanion: boolean;
  isLoading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    hasCompanion: false,
    isLoading: true,
  });

  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!mounted) return;

        if (!user) {
          setState({ isAuthenticated: false, user: null, hasCompanion: false, isLoading: false });
          return;
        }

        // Check if user has a companion
        const { data: companion } = await supabase
          .from('companions')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!mounted) return;

        setState({
          isAuthenticated: true,
          user: { id: user.id, email: user.email || '' },
          hasCompanion: !!companion,
          isLoading: false,
        });
      } catch {
        if (!mounted) return;
        setState({ isAuthenticated: false, user: null, hasCompanion: false, isLoading: false });
      }
    }

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (!session?.user) {
        setState({ isAuthenticated: false, user: null, hasCompanion: false, isLoading: false });
        return;
      }
      // Re-check companion on auth change
      checkAuth();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}
