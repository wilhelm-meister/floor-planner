import { type AnyNode, type AnyNodeId, useScene } from "@pascal-app/core";
import { useViewer } from "@pascal-app/viewer";
import { Eye, EyeOff, Lock, LockOpen, Trash2 } from "lucide-react";
import { useCallback } from "react";

interface TreeNodeActionsProps {
  node: AnyNode;
}

export function TreeNodeActions({ node }: TreeNodeActionsProps) {
  const updateNode = useScene((state) => state.updateNode);
  const updateNodes = useScene((state) => state.updateNodes);
  const selectedIds = useViewer((state) => state.selection.selectedIds);
  const isVisible = node.visible !== false;

  const toggleVisibility = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newVisibility = !isVisible;
    if (selectedIds && selectedIds.includes(node.id)) {
      updateNodes(
        selectedIds.map((id) => ({
          id: id as AnyNodeId,
          data: { visible: newVisibility },
        }))
      );
    } else {
      updateNode(node.id, { visible: newVisibility });
    }
  };

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const { deleteNode } = useScene.getState();
    if (selectedIds && selectedIds.includes(node.id)) {
      for (const id of selectedIds) {
        const n = useScene.getState().nodes[id as AnyNodeId];
        deleteNode(id as AnyNodeId);
        if (n?.parentId) useScene.getState().dirtyNodes.add(n.parentId as AnyNodeId);
      }
      useViewer.getState().setSelection({ selectedIds: [] });
    } else {
      deleteNode(node.id);
      if (node.parentId) useScene.getState().dirtyNodes.add(node.parentId as AnyNodeId);
    }
  }, [node, selectedIds]);

  return (
    <div className="flex items-center gap-0.5">
      <button
        className="w-6 h-6 flex items-center justify-center rounded-md cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
        onClick={toggleVisibility}
        title={isVisible ? "Hide" : "Show"}
      >
        {isVisible ? (
          <Eye className="w-3 h-3" />
        ) : (
          <EyeOff className="w-3 h-3 opacity-50" />
        )}
      </button>

      <button
        className="w-6 h-6 flex items-center justify-center rounded-md cursor-pointer hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
        onClick={handleDelete}
        title="Delete"
      >
        <Trash2 className="w-3 h-3" />
      </button>

      <button
        className="w-6 h-6 flex items-center justify-center rounded-md cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
        onClick={(e) => {
          e.stopPropagation()
          const isLocked = !!(node as any).locked
          if (selectedIds && selectedIds.includes(node.id)) {
            updateNodes(
              selectedIds.map((id) => ({
                id: id as AnyNodeId,
                data: { locked: !isLocked },
              }))
            )
          } else {
            updateNode(node.id, { locked: !isLocked })
          }
        }}
        title={(node as any).locked ? "Unlock position" : "Lock position"}
      >
        {(node as any).locked ? (
          <Lock className="w-3 h-3 text-amber-400" />
        ) : (
          <LockOpen className="w-3 h-3" />
        )}
      </button>
    </div>
  );
}
