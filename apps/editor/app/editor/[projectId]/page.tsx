'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Editor from '@/components/editor'
import { SceneLoader } from '@/components/ui/scene-loader'
import { useProjectStore } from '@/features/community/lib/projects/store'
import { useAuth } from '@/features/community/lib/auth/hooks'
import { SignInDialog } from '@/features/community/components/sign-in-dialog'

export default function EditorPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const [mounted, setMounted] = useState(false)
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [showSignIn, setShowSignIn] = useState(false)

  useEffect(() => {
    if (isAuthenticated && projectId) {
      useProjectStore.getState().setActiveProject(projectId)
    } else if (isAuthenticated) {
      useProjectStore.setState({ isLoading: false, isSceneLoading: false })
    }
    setMounted(true)
  }, [isAuthenticated, projectId])

  // Show sign-in dialog when auth resolves to unauthenticated
  useEffect(() => {
    if (mounted && !authLoading && !isAuthenticated) {
      setShowSignIn(true)
    }
  }, [mounted, authLoading, isAuthenticated])

  if (!mounted || authLoading) {
    return <SceneLoader fullScreen />
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-semibold">Sign in to access the Editor</h1>
          <p className="text-muted-foreground">You need to be signed in to create and edit floor plans.</p>
          <button
            className="rounded-md bg-primary px-6 py-2 text-primary-foreground text-sm transition-colors hover:bg-primary/90"
            onClick={() => setShowSignIn(true)}
          >
            Sign In
          </button>
        </div>
        <SignInDialog open={showSignIn} onOpenChange={setShowSignIn} />
      </div>
    )
  }

  return (
    <div className="flex h-screen w-full max-w-screen">
      <div className="relative h-full w-full">
        <Editor projectId={projectId} />
      </div>
    </div>
  )
}
