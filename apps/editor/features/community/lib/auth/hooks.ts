'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/auth-client'

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
 * Fetches the auth_users profile from /api/auth/me.
 */
async function fetchProfile(): Promise<AuthUser | null> {
  try {
    const res = await fetch('/api/auth/me', { cache: 'no-store' })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/**
 * Hook to access authentication state using Supabase Auth.
 */
export function useAuth() {
  const supabase = getSupabaseBrowserClient()
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  })

  const loadProfile = useCallback(
    async (hasSession: boolean) => {
      if (!hasSession) {
        setState({ user: null, isAuthenticated: false, isLoading: false })
        return
      }
      const profile = await fetchProfile()
      setState({
        user: profile,
        isAuthenticated: !!profile,
        isLoading: false,
      })
    },
    [],
  )

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then((result: { data: { session: unknown } }) => {
      loadProfile(!!result.data.session)
    })

    // Subscribe to auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event: string, session: unknown) => {
        loadProfile(!!session)
      },
    )

    return () => authListener.subscription.unsubscribe()
  }, [supabase, loadProfile])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [supabase])

  return {
    user: state.user,
    session: state.isAuthenticated ? { id: state.user?.id } : null,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    signOut,
    // signIn is a no-op here; use the SignInDialog or direct supabase calls
    signIn: supabase.auth,
  }
}
