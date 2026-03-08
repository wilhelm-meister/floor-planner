import { sfxEmitter } from '@/lib/sfx-bus'
import useEditor from '@/store/use-editor'
import { useDraftNode } from './use-draft-node'
import { usePlacementCoordinator } from './use-placement-coordinator'

/**
 * Inner component that renders when an item IS selected.
 * Separated so hooks are always called unconditionally.
 */
const ItemToolInner: React.FC<{ selectedItem: NonNullable<ReturnType<typeof useEditor.getState>['selectedItem']> }> = ({ selectedItem }) => {
  const draftNode = useDraftNode()

  const cursor = usePlacementCoordinator({
    asset: selectedItem,
    draftNode,
    initDraft: (gridPosition) => {
      if (!selectedItem?.attachTo) {
        draftNode.create(gridPosition, selectedItem)
      }
    },
    onCommitted: () => {
      sfxEmitter.emit('sfx:item-place')
      return true
    },
  })

  return <>{cursor}</>
}

export const ItemTool: React.FC = () => {
  const selectedItem = useEditor((state) => state.selectedItem)

  if (!selectedItem) return null

  return <ItemToolInner key={selectedItem.name} selectedItem={selectedItem} />
}
