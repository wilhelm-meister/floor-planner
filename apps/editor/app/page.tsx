import type { Metadata } from 'next'
import { createSupabaseServerClient } from '@/lib/supabase/auth-server'
import CommunityHub from '@/features/community/components/community-hub'
import LandingPage from '@/features/landing/components/landing-page'

export const metadata: Metadata = {
  title: 'Wilhelm Editor — 3D Floor Planner',
  description:
    'Design your home in 3D. Wilhelm Editor is the free, open-source 3D floor planner. Draw walls, place furniture, share your project.',
}

export default async function Home() {
  let user = null
  let error = null
  
  try {
    const supabase = await createSupabaseServerClient()
    const result = await supabase.auth.getUser()
    user = result.data?.user
  } catch (e) {
    console.error('[Home] Auth error:', e)
    error = e instanceof Error ? e.message : 'Unknown error'
  }

  // Log for debugging
  console.log('[Home] User:', user?.id, 'Error:', error)

  if (error) {
    // On error, show landing page
    return <LandingPage />
  }
  
  if (user) return <CommunityHub />
  return <LandingPage />
}
