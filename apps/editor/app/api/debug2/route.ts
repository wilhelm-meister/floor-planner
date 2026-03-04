import { NextResponse } from 'next/server'
import { env } from '@/env.mjs'

export async function GET() {
  return NextResponse.json({
    googleClientId: env.GOOGLE_CLIENT_ID ? `SET (len=${env.GOOGLE_CLIENT_ID.length})` : 'UNDEFINED',
    googleClientSecret: env.GOOGLE_CLIENT_SECRET ? `SET (len=${env.GOOGLE_CLIENT_SECRET.length})` : 'UNDEFINED',
    betterAuthUrl: env.BETTER_AUTH_URL ? `SET (len=${env.BETTER_AUTH_URL.length})` : 'UNDEFINED',
  })
}
