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
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) return <CommunityHub />
  return <LandingPage />
}
