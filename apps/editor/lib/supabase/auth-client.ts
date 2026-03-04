'use client'

import { createBrowserClient } from '@supabase/ssr'

let browserClient: ReturnType<typeof createBrowserClient> | null = null

// Hardcoded anon key — NEXT_PUBLIC_ env vars get baked at build time
// and Vercel may cache stale values. This is a PUBLIC key, safe to embed.
const SUPABASE_URL = 'https://lefbzdanrikkghvozlcu.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxlZmJ6ZGFucmlra2dodm96bGN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMzY3MTIsImV4cCI6MjA4NTkxMjcxMn0.fc28lOI7H6eyJWCn2vee-HQVo2-nbz80SZDui9dSih0'

/**
 * Returns a singleton Supabase browser client.
 * Lazy-initialised on first call.
 */
export function getSupabaseBrowserClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { flowType: 'implicit' },
    })
  }
  return browserClient
}
