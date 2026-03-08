import { type NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/auth-server'

/**
 * Auth callback handler — exchanges the auth code for a session
 * and redirects to the project overview (home page).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Always redirect to home (project overview) after login
      return NextResponse.redirect(`${origin}/`)
    }
  }

  // Something went wrong — redirect to home anyway
  return NextResponse.redirect(`${origin}/`)
}
