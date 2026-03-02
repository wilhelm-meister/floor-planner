'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Editor from '@/components/editor'
import { SceneLoader } from '@/components/ui/scene-loader'
import { useProjectStore } from '@/features/community/lib/projects/store'

export default function EditorPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Kein Auth/DB nötig — lokaler Modus, isLoading sofort auf false setzen
    useProjectStore.setState({ isLoading: false, isSceneLoading: false })
    setMounted(true)
  }, [])

  if (!mounted) {
    return <SceneLoader fullScreen />
  }

  return (
    <div className="flex h-screen w-full max-w-screen">
      <div className="relative h-full w-full">
        <Editor projectId={projectId} />
      </div>
    </div>
  )
}
