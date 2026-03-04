import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { db, schema } from '@pascal-app/db'
import { eq, sql } from 'drizzle-orm'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { nanoid } from 'nanoid'

/**
 * OAuth callback handler for Supabase Auth.
 * Exchanges the auth code for a session and upserts the user profile in auth_users.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (!code) {
    console.error('[auth/callback] No code in request')
    return NextResponse.redirect(new URL('/?error=missing_code', origin))
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        },
      },
    },
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession error:', error)
    return NextResponse.redirect(new URL('/?error=auth_error', origin))
  }

  const supabaseUser = data.user
  if (supabaseUser?.email) {
    try {
      await upsertUserProfile(supabaseUser)
    } catch (err) {
      console.error('[auth/callback] upsertUserProfile error:', err)
      // Non-fatal: redirect anyway
    }
  }

  return NextResponse.redirect(new URL(next, origin))
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
      .set({ name, updatedAt: new Date() })
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
