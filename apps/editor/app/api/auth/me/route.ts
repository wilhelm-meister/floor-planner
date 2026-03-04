import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/auth-server'
import { db, schema } from '@pascal-app/db'
import { sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

/**
 * GET /api/auth/me
 * Returns the auth_users profile for the currently authenticated user.
 * Used by client-side components to hydrate auth state.
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.email) {
      return NextResponse.json(null)
    }

    const result = await db
      .select()
      .from(schema.users)
      .where(sql`lower(${schema.users.email}) = lower(${user.email})`)
      .limit(1)

    return NextResponse.json(result[0] ?? null)
  } catch (error) {
    console.error('[/api/auth/me] error:', error)
    return NextResponse.json(null)
  }
}
