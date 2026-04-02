import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Creates a Supabase client for server-side use (SSR) with cookie-based sessions.
 * Use this for reading the current user's auth state in Server Components, Route Handlers, and Server Actions.
 * 
 * IMPORTANT: We only READ cookies here, never write them. Writing cookies
 * is only allowed in Server Actions and Route Handlers per Next.js rules.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        // We do NOT set cookies in Server Components - that's only allowed in
        // Server Actions and Route Handlers. The client will handle this.
        setAll: () => {
          // No-op: we intentionally don't set cookies here
        },
      },
    },
  )
}
