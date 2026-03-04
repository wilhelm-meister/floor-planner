'use client'

import { useEffect, useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/auth-client'

/**
 * Temporary debug page to diagnose auth state.
 * Visit /auth/debug after login attempt.
 */
export default function AuthDebugPage() {
  const [info, setInfo] = useState<Record<string, unknown>>({ loading: true })

  useEffect(() => {
    async function check() {
      const supabase = getSupabaseBrowserClient()

      // 1. Check browser-side session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      const { data: userData, error: userError } = await supabase.auth.getUser()

      // 2. Check /api/auth/me
      const meRes = await fetch('/api/auth/me', { cache: 'no-store' })
      const meData = await meRes.json()

      // Extract raw cookie values for debugging
      const cookieMap: Record<string, string> = {}
      document.cookie.split(';').forEach(c => {
        const [k, ...v] = c.trim().split('=')
        if (k?.includes('supabase') || k?.includes('sb-')) {
          cookieMap[k.trim()] = v.join('=').substring(0, 200) + '...'
        }
      })

      setInfo({
        browserSession: sessionData?.session
          ? { user_id: sessionData.session.user?.id, email: sessionData.session.user?.email, expires_at: sessionData.session.expires_at }
          : null,
        browserSessionError: sessionError?.message ?? null,
        browserUser: userData?.user ? { id: userData.user.id, email: userData.user.email } : null,
        browserUserError: userError?.message ?? null,
        apiAuthMe: meData,
        cookies: document.cookie ? document.cookie.split(';').map(c => c.trim().split('=')[0]) : [],
        rawCookiePreviews: cookieMap,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        keyPrefix: (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').substring(0, 20),
      })
    }
    check()
  }, [])

  return (
    <div style={{ fontFamily: 'monospace', padding: 32, maxWidth: 800 }}>
      <h1>Auth Debug</h1>
      <pre style={{ background: '#f0f0f0', padding: 16, borderRadius: 8, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
        {JSON.stringify(info, null, 2)}
      </pre>
      <br />
      <a href="/" style={{ color: 'blue' }}>← Back to app</a>
    </div>
  )
}
