import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Check what env vars are available (only show presence, not values)
    const envCheck = {
      POSTGRES_URL: !!process.env.POSTGRES_URL,
      BETTER_AUTH_SECRET: !!process.env.BETTER_AUTH_SECRET,
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || 'NOT SET',
      GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
      NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL: process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL || 'NOT SET',
      NEXT_PUBLIC_VERCEL_URL: process.env.NEXT_PUBLIC_VERCEL_URL || 'NOT SET',
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
    }

    // Try to import auth and see if it crashes
    let authStatus = 'unknown'
    try {
      const { auth } = await import('@/lib/auth')
      authStatus = auth ? 'OK' : 'null'
    } catch (e) {
      authStatus = `CRASH: ${String(e)}`
    }

    return NextResponse.json({ envCheck, authStatus })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
