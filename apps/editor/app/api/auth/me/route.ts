import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { db, schema } from '@pascal-app/db'
import { sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'

export const dynamic = 'force-dynamic'

/**
 * GET /api/auth/me
 * Returns the auth_users profile for the currently authenticated user.
 * Uses service role key to reliably read session cookies — avoids anon key build-time issues.
 */
export async function GET(request: NextRequest) {
  try {
    // Use service role key here — it's server-only, runtime-resolved, definitely correct
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: () => {}, // read-only context
        },
      },
    )

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user?.email) {
      return NextResponse.json(null)
    }

    // Look up existing profile
    const result = await db
      .select()
      .from(schema.users)
      .where(sql`lower(${schema.users.email}) = lower(${user.email})`)
      .limit(1)

    if (result[0]) {
      return NextResponse.json(result[0])
    }

    // Lazy-create profile if missing (upsert in callback may have failed)
    const name =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email.split('@')[0] ||
      'User'
    const image = user.user_metadata?.avatar_url || user.user_metadata?.picture || null

    const inserted = await db
      .insert(schema.users)
      .values({
        id: `user_${nanoid()}`,
        email: user.email,
        name,
        image,
        emailVerified: true,
      })
      .returning()

    return NextResponse.json(inserted[0] ?? null)
  } catch (error) {
    console.error('[/api/auth/me] error:', error)
    return NextResponse.json(null)
  }
}
