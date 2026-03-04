'use client'

import { Suspense, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/auth-client'

/**
 * Auth callback page — handles the OAuth code exchange in the BROWSER.
 *
 * This must run client-side because the PKCE code verifier is stored
 * in the browser's cookie jar by @supabase/ssr's createBrowserClient.
 * A server-side Route Handler cannot access it reliably.
 */
function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const exchanged = useRef(false)

  useEffect(() => {
    if (exchanged.current) return
    exchanged.current = true

    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/'

    if (!code) {
      router.replace(next)
      return
    }

    const supabase = getSupabaseBrowserClient()

    supabase.auth
      .exchangeCodeForSession(code)
      .then(({ error }: { error: Error | null }) => {
        if (error) {
          console.error('[auth/callback] exchange error:', error.message)
        }
        router.replace(next)
      })
  }, [searchParams, router])

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <p style={{ color: '#888' }}>Signing in...</p>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <p style={{ color: '#888' }}>Signing in...</p>
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  )
}
