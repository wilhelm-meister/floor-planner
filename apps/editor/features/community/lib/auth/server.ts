import { cookies } from 'next/headers'
import { db, schema } from '@pascal-app/db'
import { sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'

/**
 * Reads the Supabase session from chunked cookies and extracts user info.
 * Works in Server Components, Server Actions, and Route Handlers.
 */
async function getSupabaseUserFromCookies(): Promise<{ id: string; email: string; name: string; image: string | null } | null> {
  try {
    const cookieStore = await cookies()
    const chunk0 = cookieStore.get('sb-lefbzdanrikkghvozlcu-auth-token.0')?.value ?? ''
    const chunk1 = cookieStore.get('sb-lefbzdanrikkghvozlcu-auth-token.1')?.value ?? ''
    if (!chunk0) return null

    const b64part0 = chunk0.startsWith('base64-') ? chunk0.slice(7) : chunk0
    const b64part1 = chunk1.startsWith('base64-') ? chunk1.slice(7) : chunk1
    const sessionStr = Buffer.from(b64part0 + b64part1, 'base64').toString('utf-8')
    const session = JSON.parse(sessionStr)

    const accessToken: string = session?.access_token
    if (!accessToken) return null

    const payloadB64 = accessToken.split('.')[1]
    if (!payloadB64) return null
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'))

    const userId: string = payload.sub
    const email: string = payload.email
    if (!userId || !email) return null

    const userMeta = session?.user?.user_metadata ?? {}
    const name: string = userMeta.full_name || userMeta.name || email.split('@')[0] || 'User'
    const image: string | null = userMeta.avatar_url || userMeta.picture || null

    return { id: userId, email, name, image }
  } catch {
    return null
  }
}

/**
 * Get the current session from Supabase Auth (server-side).
 * Returns the auth_users profile + a minimal session object.
 * Creates the profile lazily if it doesn't exist yet.
 */
export async function getSession() {
  try {
    const supabaseUser = await getSupabaseUserFromCookies()
    if (!supabaseUser?.email) return null

    // Look up existing profile
    const result = await db
      .select()
      .from(schema.users)
      .where(sql`lower(${schema.users.email}) = lower(${supabaseUser.email})`)
      .limit(1)

    let profile = result[0]

    // Lazy-create if missing
    if (!profile) {
      const inserted = await db
        .insert(schema.users)
        .values({
          id: `user_${nanoid()}`,
          email: supabaseUser.email,
          name: supabaseUser.name,
          image: supabaseUser.image,
          emailVerified: true,
        })
        .returning()
      profile = inserted[0]
    }

    if (!profile) return null

    return {
      user: profile,
      session: { id: supabaseUser.id },
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
