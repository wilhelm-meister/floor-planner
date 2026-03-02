"use client";

import useEditor from "@/store/use-editor";
import { useViewer } from "@pascal-app/viewer";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/primitives/tooltip";
import { Magnet } from "lucide-react";
import { cn } from "@/lib/utils";

export function SnapToggle() {
  const snapEnabled = useEditor((s) => s.snapEnabled);
  const snapSize = useEditor((s) => s.snapSize);
  const snapShiftOverride = useEditor((s) => s.snapShiftOverride);

  // Visually "off" when Shift is held (temporary override during placement)
  const effectivelyOn = snapEnabled && !snapShiftOverride;

  // Write to both stores: useEditor (wall-tool, wall-edge-handles) + useViewer (applySnap in wall-renderer)
  const setSnapEnabled = (enabled: boolean) => {
    useEditor.getState().setSnapEnabled(enabled);
    useViewer.getState().setSnapEnabled(enabled);
  };
  const setSnapSize = (size: 0.5 | 0.25) => {
    useEditor.getState().setSnapSize(size);
    useViewer.getState().setSnapSize(size);
  };

  return (
    <div className="flex items-center gap-0.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setSnapEnabled(!snapEnabled)}
            className={cn(
              "flex h-8 items-center gap-1 rounded-lg px-2 text-sm font-medium transition-colors",
              effectivelyOn
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Magnet className={cn("h-3.5 w-3.5", !effectivelyOn && "opacity-40")} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">
          {snapShiftOverride ? "Snap pausiert (Shift)" : snapEnabled ? "Snap deaktivieren" : "Snap aktivieren"}
        </TooltipContent>
      </Tooltip>

      {effectivelyOn && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setSnapSize(snapSize === 0.5 ? 0.25 : 0.5)}
              className="flex h-8 items-center rounded-lg px-2 text-xs font-mono text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              {snapSize === 0.5 ? "50cm" : "25cm"}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            Raster: {snapSize === 0.5 ? "50cm → auf 25cm wechseln" : "25cm → auf 50cm wechseln"}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
