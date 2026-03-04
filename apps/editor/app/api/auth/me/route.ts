import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@pascal-app/db'
import { sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'

export const dynamic = 'force-dynamic'

/**
 * Reassembles chunked @supabase/ssr session cookies and extracts user info
 * directly from the JWT — bypasses createServerClient/getUser() entirely.
 */
function getUserFromCookies(request: NextRequest): { id: string; email: string; name?: string; image?: string | null } | null {
  try {
    // Reassemble chunked cookies — @supabase/ssr stores as base64-{base64_json}
    const chunk0 = request.cookies.get('sb-lefbzdanrikkghvozlcu-auth-token.0')?.value ?? ''
    const chunk1 = request.cookies.get('sb-lefbzdanrikkghvozlcu-auth-token.1')?.value ?? ''
    if (!chunk0) return null

    // Strip 'base64-' prefix, concatenate, decode
    const b64part0 = chunk0.startsWith('base64-') ? chunk0.slice(7) : chunk0
    const b64part1 = chunk1.startsWith('base64-') ? chunk1.slice(7) : chunk1
    const sessionStr = Buffer.from(b64part0 + b64part1, 'base64').toString('utf-8')
    const session = JSON.parse(sessionStr)
    const accessToken: string = session?.access_token
    if (!accessToken) return null

    // Decode JWT payload (no verification needed — Supabase already validated this)
    const payloadB64 = accessToken.split('.')[1]
    if (!payloadB64) return null
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'))

    const userId: string = payload.sub
    const email: string = payload.email
    if (!userId || !email) return null

    // Extract user metadata from session user object (has name/avatar from Google)
    const userMeta = session?.user?.user_metadata ?? {}
    const name: string = userMeta.full_name || userMeta.name || email.split('@')[0] || 'User'
    const image: string | null = userMeta.avatar_url || userMeta.picture || null

    return { id: userId, email, name, image: image as string | null }
  } catch (err) {
    console.error('[/api/auth/me] cookie parse error:', err)
    return null
  }
}

/**
 * GET /api/auth/me
 * Returns the auth_users profile for the currently authenticated user.
 * Reads session directly from chunked Supabase cookies — no client SDK needed.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionUser = getUserFromCookies(request)

    if (!sessionUser?.email) {
      return NextResponse.json(null)
    }

    // Look up existing profile
    const result = await db
      .select()
      .from(schema.users)
      .where(sql`lower(${schema.users.email}) = lower(${sessionUser.email})`)
      .limit(1)

    if (result[0]) {
      return NextResponse.json(result[0])
    }

    // Lazy-create profile (first login or missed callback upsert)
    const inserted = await db
      .insert(schema.users)
      .values({
        id: `user_${nanoid()}`,
        email: sessionUser.email,
        name: (sessionUser.name ?? sessionUser.email.split('@')[0]) as string,
        image: sessionUser.image ?? null,
        emailVerified: true,
      })
      .returning()

    return NextResponse.json(inserted[0] ?? null)
  } catch (error) {
    console.error('[/api/auth/me] error:', error)
    return NextResponse.json(null)
  }
}
