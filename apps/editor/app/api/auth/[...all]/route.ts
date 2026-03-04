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
    return await handler.GET(req)
  } catch (error) {
    console.error('[AUTH GET ERROR]', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    return await handler.POST(req)
  } catch (error) {
    console.error('[AUTH POST ERROR]', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
