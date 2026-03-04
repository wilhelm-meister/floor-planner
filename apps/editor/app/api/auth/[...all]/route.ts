/**
 * Better Auth API route handler
 * Handles all /api/auth/* routes for authentication
 */

import { toNextJsHandler } from 'better-auth/next-js'
import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

const handler = toNextJsHandler(auth)

export async function GET(req: NextRequest) {
  try {
    const res = await handler.GET(req)
    if (res.status >= 500) {
      const body = await res.clone().text()
      console.error('[AUTH GET 5xx]', res.status, body)
    }
    return res
  } catch (error) {
    console.error('[AUTH GET THROW]', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.clone().json().catch(() => ({}))
    
    // Check if Google credentials are actually being read
    const { env } = await import('@/env.mjs')
    const googleId = env.GOOGLE_CLIENT_ID || ''
    const googleSecret = env.GOOGLE_CLIENT_SECRET || ''
    
    // Log for debugging
    console.log('[AUTH DEBUG] Google ID:', googleId.substring(0,10), 'len:', googleId.length)
    console.log('[AUTH DEBUG] Google Secret:', googleSecret.substring(0,10), 'len:', googleSecret.length)
    
    // Call handler
    const res = await handler.POST(req)
    
    // If error, try to get error details
    if (res.status >= 400) {
      const resBody = await res.clone().text()
      return NextResponse.json({
        debug: true,
        status: res.status,
        envGoogleClientId: !!env.GOOGLE_CLIENT_ID,
        envGoogleClientSecret: !!env.GOOGLE_CLIENT_SECRET,
        betterAuthUrl: env.BETTER_AUTH_URL,
        responseBody: resBody || '(empty)'
      }, { status: res.status })
    }
    
    return res
  } catch (error) {
    return NextResponse.json({ 
      debug: true,
      error: String(error), 
      stack: (error as Error).stack 
    }, { status: 500 })
  }
}
