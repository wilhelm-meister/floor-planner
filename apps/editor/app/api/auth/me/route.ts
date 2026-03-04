import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/auth-server'
import { db, schema } from '@pascal-app/db'
import { eq, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'

export const dynamic = 'force-dynamic'

/**
 * GET /api/auth/me
 * Returns the auth_users profile for the currently authenticated user.
 * Creates the profile lazily if the user exists in Supabase Auth but not yet in auth_users.
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
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

    // Profile doesn't exist yet — create it lazily (upsert in callback may have failed)
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
