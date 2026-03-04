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
 * Uses SUPABASE_SERVICE_ROLE_KEY to reliably exchange tokens (avoids
 * build-time anon key issues on Vercel).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/'

  const redirectUrl = new URL(next, origin)
  const response = NextResponse.redirect(redirectUrl)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
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
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error('[auth/callback] exchangeCodeForSession error:', error.message)
      // Don't block — redirect home, browser client will pick up session
      return NextResponse.redirect(new URL(next, origin))
    }
    supabaseUser = data.user
  } else if (tokenHash && type === 'email') {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'email',
    })
    if (error) {
      console.error('[auth/callback] verifyOtp error:', error.message)
      return NextResponse.redirect(new URL(next, origin))
    }
    supabaseUser = data.user ?? null
  } else {
    return NextResponse.redirect(new URL(next, origin))
  }

  if (supabaseUser?.email) {
    try {
      await upsertUserProfile(supabaseUser)
    } catch (err) {
      console.error('[auth/callback] upsertUserProfile error:', err)
    }
  }

  return response
}

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
