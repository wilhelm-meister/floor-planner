'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/auth-client'
import type { User as SupabaseUser } from '@supabase/supabase-js'

export interface AuthUser {
  id: string
  email: string
  name: string
  image: string | null
  username: string | null
  role: string
  [key: string]: unknown
}

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
}

/**
 * Converts a Supabase Auth user to our AuthUser format.
 * Uses Google user_metadata for name/image as fallback.
 */
function supabaseUserToAuthUser(user: SupabaseUser): AuthUser {
  return {
    id: user.id,
    email: user.email ?? '',
    name:
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      'User',
    image: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
    username: null,
    role: 'user',
  }
}

/**
 * Hook to access authentication state using Supabase Auth.
 *
 * Auth state comes DIRECTLY from the Supabase browser client session.
 * Profile enrichment from /api/auth/me happens in the background
 * but does NOT block the isAuthenticated state.
 */
export function useAuth() {
  const supabase = getSupabaseBrowserClient()
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  })

  const handleSession = useCallback((user: SupabaseUser | null) => {
    if (!user) {
      setState({ user: null, isAuthenticated: false, isLoading: false })
      return
    }

    // Immediately mark as authenticated using Supabase session data
    const authUser = supabaseUserToAuthUser(user)
    setState({ user: authUser, isAuthenticated: true, isLoading: false })

    // Enrich with profile data in background (username, etc.)
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => res.json())
      .then((profile) => {
        if (profile?.id) {
          setState((prev) => ({
            ...prev,
            user: { ...authUser, ...profile },
          }))
        }
      })
      .catch(() => {
        // Profile enrichment failed — that's OK, basic auth still works
      })
  }, [])

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: { user?: SupabaseUser } | null } }) => {
      handleSession(session?.user ?? null)
    })

    // Subscribe to auth state changes (fires on login, logout, token refresh)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event: string, session: unknown) => {
        const user = (session as { user?: SupabaseUser } | null)?.user ?? null
        handleSession(user)
      },
    )

    return () => authListener.subscription.unsubscribe()
  }, [supabase, handleSession])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [supabase])

  return {
    user: state.user,
    session: state.isAuthenticated ? { id: state.user?.id } : null,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    signOut,
    signIn: supabase.auth,
  }
}
