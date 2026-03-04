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
    console.log('[AUTH POST]', req.url, JSON.stringify(body))
    const res = await handler.POST(req)
    if (res.status >= 400) {
      const resBody = await res.clone().text()
      console.error('[AUTH POST ERROR]', res.status, resBody)
      // Return the error body so we can see it
      if (!resBody) {
        return NextResponse.json({ 
          debug: true,
          status: res.status, 
          url: req.url,
          body: body,
          headers: Object.fromEntries(res.headers.entries())
        }, { status: res.status })
      }
    }
    return res
  } catch (error) {
    console.error('[AUTH POST THROW]', error)
    return NextResponse.json({ error: String(error), stack: (error as Error).stack }, { status: 500 })
  }
}
