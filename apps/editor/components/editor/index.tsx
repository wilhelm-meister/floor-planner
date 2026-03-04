'use client'

import { initSpaceDetectionSync, initSpatialGridSync, useScene } from '@pascal-app/core'
import { useViewer, Viewer } from '@pascal-app/viewer'
import { useEffect } from 'react'
import { useProjectScene } from '@/features/community/lib/models/hooks'
import { useProjectStore } from '@/features/community/lib/projects/store'
import { useKeyboard } from '@/hooks/use-keyboard'
import { initSFXBus } from '@/lib/sfx-bus'
import useEditor from '@/store/use-editor'
import { FeedbackDialog } from '../feedback-dialog'
import { AiRenderButton } from '../ai-render/ai-render-button'
import { ScreenshotHelper } from '../ai-render/screenshot-helper'
import { CeilingSystem } from '../systems/ceiling/ceiling-system'
import { ZoneSystem } from '../systems/zone/zone-system'
import { ToolManager } from '../tools/tool-manager'
import { ActionMenu } from '../ui/action-menu'
import { HelperManager } from '../ui/helpers/helper-manager'
import { PanelManager } from '../ui/panels/panel-manager'
import { SidebarProvider } from '../ui/primitives/sidebar'
import { SceneLoader } from '../ui/scene-loader'
import { AppSidebar } from '../ui/sidebar/app-sidebar'
import { CustomCameraControls } from './custom-camera-controls'
import { ExportManager } from './export-manager'
import { FloatingActionMenu } from './floating-action-menu'
import { Grid } from './grid'
import { SelectionManager } from './selection-manager'
import { SiteEdgeLabels } from './site-edge-labels'
import { ThumbnailGenerator } from './thumbnail-generator'
import { WalkthroughControls } from '../walkthrough/walkthrough-controls'
import { WalkthroughCursor } from '../walkthrough/walkthrough-cursor'
import { WalkthroughOverlay } from '../walkthrough/walkthrough-overlay'


// Load default scene initially (will be replaced when project loads)
useScene.getState().loadScene()

// Cleanup: GuideNodes mit blob:-URLs entfernen (ungültig nach Reload)
{
  const nodes = useScene.getState().nodes as Record<string, any>
  for (const node of Object.values(nodes)) {
    if (node.type === 'guide' && typeof node.url === 'string' && node.url.startsWith('blob:')) {
      useScene.getState().deleteNode(node.id)
    }
  }
}
initSpatialGridSync()
initSpaceDetectionSync(useScene, useEditor)

// Auto-select the first building and level for the default scene
const sceneNodes = useScene.getState().nodes as Record<string, any>
const sceneRootIds = useScene.getState().rootNodeIds
const siteNode = sceneRootIds[0] ? sceneNodes[sceneRootIds[0]] : null
const resolve = (child: any) => (typeof child === 'string' ? sceneNodes[child] : child)
const firstBuilding = siteNode?.children?.map(resolve).find((n: any) => n?.type === 'building')
const firstLevel = firstBuilding?.children?.map(resolve).find((n: any) => n?.type === 'level')

if (firstBuilding && firstLevel) {
  useViewer.getState().setSelection({
    buildingId: firstBuilding.id,
    levelId: firstLevel.id,
    selectedIds: [],
    zoneId: null,
  })
  useEditor.getState().setPhase('structure')
  useEditor.getState().setStructureLayer('elements')

  // Auto-select the wall tool if the level is empty
  if (!firstLevel.children || firstLevel.children.length === 0) {
    useEditor.getState().setMode('build')
    useEditor.getState().setTool('wall')
  }
}

// Initialize SFX bus to connect events to sound effects
initSFXBus()

interface EditorProps {
  projectId?: string
}

export default function Editor({ projectId }: EditorProps) {
  useKeyboard()
  useProjectScene()

  const isProjectLoading = useProjectStore((state) => state.isLoading)
  const isSceneLoading = useProjectStore((state) => state.isSceneLoading)
  const isLoading = isProjectLoading || isSceneLoading

  useEffect(() => {
    if (projectId) {
      useViewer.getState().setProjectId(projectId)
    } else {
      useViewer.getState().setProjectId(null)
    }
  }, [projectId])

  useEffect(() => {
    document.body.classList.add('dark')
    return () => {
      document.body.classList.remove('dark')
    }
  }, [])

  return (
    <div className="w-full h-full dark text-foreground">
      {isLoading && <SceneLoader />}
      <ActionMenu />
      <PanelManager />
      <HelperManager />

      {/* Walkthrough overlay (exit button + crosshair) */}
      <WalkthroughOverlay />
      <WalkthroughCursor />

      {/* Top-right controls */}
      <div className="pointer-events-none fixed top-4 right-4 z-50 flex items-start gap-2">
        <div className="pointer-events-auto">
          <AiRenderButton />
        </div>
        <div className="pointer-events-auto">
          <FeedbackDialog projectId={projectId} />
        </div>
      </div>

      <SidebarProvider className="fixed z-20">
        <AppSidebar />
      </SidebarProvider>
      <Viewer selectionManager="custom">
        <SelectionManager />
        <FloatingActionMenu />
        <ExportManager />
        {/* Editor only system to toggle zone visibility */}
        <ZoneSystem />
        <CeilingSystem />
        {/* <Stats /> */}
        <Grid cellColor="#aaa" sectionColor="#ccc" fadeDistance={500} />
        <ToolManager />
        <CustomCameraControls />
        <WalkthroughControls />
        <ThumbnailGenerator projectId={projectId} />
        <SiteEdgeLabels />
        <ScreenshotHelper />
      </Viewer>
    </div>
  )
}
