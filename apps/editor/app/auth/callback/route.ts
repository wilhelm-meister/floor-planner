import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { db, schema } from '@pascal-app/db'
import { eq, sql } from 'drizzle-orm'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { nanoid } from 'nanoid'

/**
 * Auth callback handler for Supabase Auth.
 *
 * Handles two flows:
 *  1. Google OAuth (PKCE) — arrives with ?code=XXX
 *  2. Magic Link (OTP)    — arrives with ?token_hash=XXX&type=email
 *
 * After authentication, upserts the user's profile in auth_users and redirects.
 *
 * NOTE: In Next.js 15+ Route Handlers, cookies are read-only on the incoming
 * request. We must set cookies on the outgoing NextResponse object.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/'

  // Build the redirect response first so we can attach cookies to it
  const redirectUrl = new URL(next, origin)
  const response = NextResponse.redirect(redirectUrl)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Read from the incoming request
        getAll: () => request.cookies.getAll(),
        // Write to the outgoing response
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  let supabaseUser: SupabaseUser | null = null

  if (code) {
    // --- Google OAuth (PKCE) flow ---
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'MISSING_URL'
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'MISSING_KEY'
    console.error('[auth/callback] url:', supabaseUrl, 'key_prefix:', supabaseKey.substring(0, 20))
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error('[auth/callback] exchangeCodeForSession error:', error.message)
      return NextResponse.redirect(new URL(`/?error=auth_error&detail=${encodeURIComponent(error.message)}&url=${encodeURIComponent(supabaseUrl)}&key=${encodeURIComponent(supabaseKey.substring(0,15))}`, origin))
    }
    supabaseUser = data.user
  } else if (tokenHash && type === 'email') {
    // --- Magic Link (OTP) flow ---
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'email',
    })
    if (error) {
      console.error('[auth/callback] verifyOtp error:', error.message)
      return NextResponse.redirect(new URL('/?error=auth_error', origin))
    }
    supabaseUser = data.user ?? null
  } else {
    console.error('[auth/callback] No code or token_hash in request')
    return NextResponse.redirect(new URL('/?error=missing_params', origin))
  }

  if (supabaseUser?.email) {
    try {
      await upsertUserProfile(supabaseUser)
    } catch (err) {
      console.error('[auth/callback] upsertUserProfile error:', err)
      // Non-fatal: redirect anyway, profile will be created on next /api/auth/me call
    }
  }

  return response
}

/**
 * Upserts a row in auth_users for the given Supabase Auth user.
 * Uses email as the unique key. Creates a new row with a prefixed nanoid if not found.
 */
async function upsertUserProfile(user: SupabaseUser) {
  const email = user.email!
  const name =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    email.split('@')[0] ||
    'User'
  const image = user.user_metadata?.avatar_url || user.user_metadata?.picture || null

  const existing = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(sql`lower(${schema.users.email}) = lower(${email})`)
    .limit(1)

  if (existing.length > 0 && existing[0]) {
    await db
      .update(schema.users)
      .set({ name, image, updatedAt: new Date() })
      .where(eq(schema.users.id, existing[0].id))
  } else {
    await db.insert(schema.users).values({
      id: `user_${nanoid()}`,
      email,
      name,
      image,
      emailVerified: true,
    })
  }
}
