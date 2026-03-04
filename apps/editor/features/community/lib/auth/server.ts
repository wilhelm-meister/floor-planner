import { createSupabaseServerClient } from '@/lib/supabase/auth-server'
import { db, schema } from '@pascal-app/db'
import { sql } from 'drizzle-orm'

/**
 * Get the current session from Supabase Auth (server-side).
 * Returns the auth_users profile (nanoid id) + a minimal session object.
 */
export async function getSession() {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.email) {
      return null
    }

    const result = await db
      .select()
      .from(schema.users)
      .where(sql`lower(${schema.users.email}) = lower(${user.email})`)
      .limit(1)

    const profile = result[0]
    if (!profile) {
      return null
    }

    return {
      user: profile,
      session: { id: user.id },
    }
  } catch (error) {
    console.error('[getSession] error:', error)
    return null
  }
}

/**
 * Get the current user from the session.
 */
export async function getUser() {
  const session = await getSession()
  return session?.user ?? null
}
